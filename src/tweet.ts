import * as i from 'twitter-openapi-typescript-generated';
import { findDifferences, hasDiff } from "./obj-diff";
import { TwitterOpenApiClient } from "twitter-openapi-typescript";
import { PrismaClient } from "@prisma/client";
import type { TweetApiUtilsData } from "twitter-openapi-typescript/dist/src/models/timeline";
import { get, result } from "lodash";

interface GetUserResult {
    user: i.User,
    screenName: string,
    // 获取时间
    getTime: number,
}

// 检查并返回两次获取的用户信息的差异
const getUserDiff = (user1: GetUserResult, user2: GetUserResult) => {
    return findDifferences(user1, user2, { metadataFields: ["getTime"] });
}

const extraTweetMedia = (tweet: TweetApiUtilsData) => {
    // 提取图片
    const mediaItems = get(tweet, "raw.result.legacy.extendedEntities.media", []);
    const images = mediaItems
        .filter((media: any) => media.type === "photo")
        .map((media: any) => media.mediaUrlHttps);

    // 提取视频
    const videos = mediaItems
        .filter(
            (media: any) => media.type === "video" || media.type === "animated_gif"
        )
        .map((media: any) => {
            const variants = get(media, "videoInfo.variants", []);
            const bestQuality = variants
                .filter((v: any) => v.contentType === "video/mp4")
                .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];
            return bestQuality?.url;
        })
        .filter(Boolean);
    return { images, videos };
}

enum TweetType {
    Retweet,
    Quoted,
    Reply,
    Normal
}

const getTweetTypeAndFullText = (tweet: TweetApiUtilsData) => {
    // retweet
    if (tweet.retweeted) {
        if (tweet.quoted) {
            return {
                type: TweetType.Quoted,
                fullText: tweet.quoted.tweet.legacy?.fullText
            }
        }
        return {
            type: TweetType.Retweet,
            fullText: tweet.retweeted.tweet.legacy?.fullText
        };
    }

    if (tweet.quoted) {
        return {
            type: TweetType.Quoted,
            fullText: tweet.quoted.tweet.legacy?.fullText
        }
    }

    return { fullText: tweet.tweet.legacy?.fullText, type: TweetType.Normal }
}

const singleTweetApiDataToDbData = (tweet: TweetApiUtilsData) => {
    const media = extraTweetMedia(tweet);
    const screenName = get(tweet, "user.legacy.screenName");
    const tweetUrl = `https://x.com/${screenName}/status/${get(
        tweet,
        "raw.result.legacy.idStr"
    )}`;
    return {
        userId: tweet.user.restId,
        tweetId: tweet.tweet.restId,
        fullText: getTweetTypeAndFullText(tweet)?.fullText ?? "",
        media: JSON.stringify(media),
        tweetUrl,
        rawJson: JSON.stringify(tweet.raw),
        sendTime: tweet.tweet.legacy?.createdAt ? new Date(tweet.tweet.legacy?.createdAt) : new Date(),
        createdAt: new Date()
    }
}

const tweetApiDataToDbData = (data: TweetApiUtilsData[]) => {
    const saveData = data.map((tweet) => {
        return singleTweetApiDataToDbData(tweet)
    });
    return saveData;
}

export class TeweetClient {
    prisma: PrismaClient;
    client: TwitterOpenApiClient;

    constructor(prisma: PrismaClient, client: TwitterOpenApiClient) {
        this.prisma = prisma;
        this.client = client;
    }

    getNextFetchScreenName = async () => {
        const neverFetchedUser = await this.prisma.fetchUserScreenName.findFirst({
            where: {
                OR: [
                    { lastFetchAt: null },
                    { lastFetchAt: { not: null } }
                ]
            },
            orderBy: [
                { lastFetchAt: { sort: 'asc', nulls: 'first' } },
                { id: 'asc' }
            ]
        });
        return neverFetchedUser
    }

    getUserByScreenName = async (screenName: string): Promise<GetUserResult> => {
        let getTs = Date.now();
        let resp = await this.client.getUserApi().getUserByScreenName({ screenName });
        return { user: resp.data.user!!, screenName, getTime: getTs };
    }



    fetchUser = async (screenName: string) => {
        try {
            let now = new Date();
            let resp = await this.client.getUserApi().getUserByScreenName({ screenName });
            const { data: { user, raw } } = resp;
            if (user === undefined) {
                console.warn(`无法通过 api 获取用户 ${screenName}`);
                throw new Error(`无法通过 api 获取用户 ${screenName}`);
            }
            const prevUser = await this.prisma.user.findFirst({
                where: {
                    userId: user.restId
                }
            });
            if (prevUser === null) {
                console.info(`用户 ${screenName} 不存在，将创建用户`);
                await this.prisma.user.create({
                    data: {
                        rawJson: JSON.stringify(raw),
                        userId: user.restId,
                        createdAt: now,
                        updatedAt: now,
                        screenName: user.legacy.screenName,
                        description: user.legacy.description,
                        name: user.legacy.name,
                        followersCount: user.legacy.followersCount,
                        friendsCount: user.legacy.friendsCount,
                    }
                });
            } else {
                const diff = findDifferences(
                    { ...JSON.parse(prevUser.rawJson) as i.UserResults, ts: prevUser.updatedAt.getMilliseconds() },
                    { ...raw, ts: now.getMilliseconds() },
                    { metadataFields: ["ts"] }
                );
                if (hasDiff(diff)) {
                    console.info({ msg: `用户 ${screenName} 信息有变化`, diff: diff });

                    await this.prisma.$transaction([
                        this.prisma.user.update({
                            where: {
                                userId: user.restId
                            },
                            data: {
                                name: user.legacy.name,
                                description: user.legacy.description,
                                followersCount: user.legacy.followersCount,
                                friendsCount: user.legacy.friendsCount,
                                screenName: user.legacy.screenName,
                                rawJson: JSON.stringify(raw),
                                updatedAt: now
                            }
                        }),
                        this.prisma.userDiff.create({
                            data: {
                                userId: user.restId,
                                createdAt: now,
                                prevJson: prevUser.rawJson,
                                diffJson: JSON.stringify(diff),
                                newTime: now,
                                prevTime: prevUser.updatedAt
                            }
                        })
                    ])
                }
            }

            return user;
        } catch (e) {
            console.error(`获取用户 ${screenName} 时出错: ${e}`);
            throw e
        }
    }

    fetchUserTweetsAndReplies = async (userId: string) => {
        let getUserTweetsResp = await this.client.getTweetApi().getUserTweets({
            userId: userId,
            count: 10,
        });

        const { data, raw, cursor } = getUserTweetsResp.data;

        console.debug(`got ${data.length} number tweets`);

        const ops = data.map((t) => {
            return this.prisma.tweet.upsert({
                where: { tweetId: t.tweet.restId, },
                create: singleTweetApiDataToDbData(t),
                update: singleTweetApiDataToDbData(t)
            })
        });

        return this.prisma.$transaction(ops);
    }

    setUserLastFetchedTime = async (id: number) => {
        return this.prisma.fetchUserScreenName.update({
					where: { id },
					data: { lastFetchAt: new Date() }
				});
    }
}
