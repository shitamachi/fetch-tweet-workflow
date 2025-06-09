-- CreateTable
CREATE TABLE "Tweet" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "tweetId" TEXT NOT NULL,
    "fullText" TEXT NOT NULL,
    "tweetUrl" TEXT NOT NULL,
    "media" TEXT NOT NULL,
    "sendTime" DATETIME NOT NULL,
    "rawJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "FetchTweetRawJson" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "tweetIds" TEXT NOT NULL,
    "rawJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "screenName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "followersCount" INTEGER NOT NULL,
    "friendsCount" INTEGER NOT NULL,
    "rawJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserDiff" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "diffJson" TEXT NOT NULL,
    "prevTime" DATETIME NOT NULL,
    "newTime" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "FetchUserScreenName" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "screenName" TEXT NOT NULL,
    "lastFetchAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Tweet_tweetId_key" ON "Tweet"("tweetId");

-- CreateIndex
CREATE INDEX "Tweet_userId_idx" ON "Tweet"("userId");

-- CreateIndex
CREATE INDEX "FetchTweetRawJson_userId_idx" ON "FetchTweetRawJson"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_userId_key" ON "User"("userId");

-- CreateIndex
CREATE INDEX "UserDiff_userId_idx" ON "UserDiff"("userId");

-- Init Data
insert into FetchUserScreenName (screenName)
values ('sasakirico'),
       ('AkaneY_banu'),
       ('okada_mei0519'),
       ('Kanon_Takao'),
       ('Watase_Yuzuki'),
       ('aoki__hina'),
       ('ttisrn_0710'),
       ('cocohayashi515'),
       ('kohinatamika'),
       ('Hina_Youmiya'),
       ('unicococ');