/// <reference types="jest" />
import { findDifferences, hasDiff, getMetadataChanges, DiffOptions } from './obj-diff';
import { IAtomicChange } from 'json-diff-ts';

describe('obj-diff', () => {
    describe('findDifferences', () => {
        it('应该检测到基本属性的差异', () => {
            const obj1 = { name: 'Alice', age: 25 };
            const obj2 = { name: 'Bob', age: 25 };
            
            const result = findDifferences(obj1, obj2);
            
            expect(result).toHaveLength(1);
            expect(result[0].type).toBe('UPDATE');
            expect(result[0].key).toBe('name');
            expect(result[0].path).toBe('$.name');
            expect(result[0].oldValue).toBe('Alice');
            expect(result[0].value).toBe('Bob');
        });

        it('应该检测到数值属性的差异', () => {
            const obj1 = { count: 10, price: 99.99 };
            const obj2 = { count: 15, price: 89.99 };
            
            const result = findDifferences(obj1, obj2);
            
            expect(result).toHaveLength(2);
            
            const countChange = result.find(c => c.path === '$.count');
            expect(countChange).toBeDefined();
            expect(countChange!.type).toBe('UPDATE');
            expect(countChange!.oldValue).toBe(10);
            expect(countChange!.value).toBe(15);
            
            const priceChange = result.find(c => c.path === '$.price');
            expect(priceChange).toBeDefined();
            expect(priceChange!.type).toBe('UPDATE');
            expect(priceChange!.oldValue).toBe(99.99);
            expect(priceChange!.value).toBe(89.99);
        });

        it('应该检测到嵌套对象的差异', () => {
            const obj1 = {
                user: {
                    name: 'Alice',
                    profile: { city: 'New York', age: 25 }
                }
            };
            const obj2 = {
                user: {
                    name: 'Alice',
                    profile: { city: 'Boston', age: 26 }
                }
            };
            
            const result = findDifferences(obj1, obj2);
            
            expect(result.length).toBeGreaterThan(0);
            
            const cityChange = result.find(c => c.path === '$.user.profile.city');
            expect(cityChange).toBeDefined();
            expect(cityChange!.type).toBe('UPDATE');
            expect(cityChange!.oldValue).toBe('New York');
            expect(cityChange!.value).toBe('Boston');
            
            const ageChange = result.find(c => c.path === '$.user.profile.age');
            expect(ageChange).toBeDefined();
            expect(ageChange!.type).toBe('UPDATE');
            expect(ageChange!.oldValue).toBe(25);
            expect(ageChange!.value).toBe(26);
        });

        it('应该检测到数组的差异', () => {
            const obj1 = { tags: ['javascript', 'react'] };
            const obj2 = { tags: ['javascript', 'vue', 'typescript'] };
            
            const result = findDifferences(obj1, obj2);
            
            expect(result.length).toBeGreaterThan(0);
            
            // 应该有数组变更
            const arrayChanges = result.filter(c => c.path.startsWith('$.tags'));
            expect(arrayChanges.length).toBeGreaterThan(0);
        });

        it('应该检测到布尔值和null的差异', () => {
            const obj1 = { active: true, data: null as any };
            const obj2 = { active: false, data: 'something' as any };
            
            const result = findDifferences(obj1, obj2);
            
            // json-diff-ts 对于类型变化可能产生 REMOVE + ADD 操作
            expect(result.length).toBeGreaterThanOrEqual(2);
            
            const activeChange = result.find(c => c.path === '$.active');
            expect(activeChange).toBeDefined();
            expect(activeChange!.type).toBe('UPDATE');
            expect(activeChange!.oldValue).toBe(true);
            expect(activeChange!.value).toBe(false);
            
            // data 字段从 null 变为 string，可能是 REMOVE + ADD
            const dataChanges = result.filter(c => c.path === '$.data');
            expect(dataChanges.length).toBeGreaterThan(0);
            
            // 检查是否有涉及 'something' 值的变更
            const dataWithSomething = dataChanges.find(c => c.value === 'something');
            expect(dataWithSomething).toBeDefined();
        });

        it('应该检测到添加的属性', () => {
            const obj1 = { name: 'Alice' };
            const obj2 = { name: 'Alice', age: 25, email: 'alice@example.com' };
            
            const result = findDifferences(obj1, obj2);
            
            expect(result).toHaveLength(2);
            
            const ageChange = result.find(c => c.path === '$.age');
            expect(ageChange).toBeDefined();
            expect(ageChange!.type).toBe('ADD');
            expect(ageChange!.value).toBe(25);
            
            const emailChange = result.find(c => c.path === '$.email');
            expect(emailChange).toBeDefined();
            expect(emailChange!.type).toBe('ADD');
            expect(emailChange!.value).toBe('alice@example.com');
        });

        it('应该检测到删除的属性', () => {
            const obj1 = { name: 'Alice', age: 25, email: 'alice@example.com' };
            const obj2 = { name: 'Alice' };
            
            const result = findDifferences(obj1, obj2);
            
            expect(result).toHaveLength(2);
            
            const ageChange = result.find(c => c.path === '$.age');
            expect(ageChange).toBeDefined();
            expect(ageChange!.type).toBe('REMOVE');
            expect(ageChange!.value).toBe(25);
            
            const emailChange = result.find(c => c.path === '$.email');
            expect(emailChange).toBeDefined();
            expect(emailChange!.type).toBe('REMOVE');
            expect(emailChange!.value).toBe('alice@example.com');
        });

        it('应该过滤掉元数据字段', () => {
            const obj1 = { name: 'Alice', age: 25, timestamp: 1000 };
            const obj2 = { name: 'Bob', age: 25, timestamp: 2000 };
            
            const result = findDifferences(obj1, obj2, { metadataFields: ['timestamp'] });
            
            expect(result).toHaveLength(1);
            expect(result[0].path).toBe('$.name');
            expect(result[0].oldValue).toBe('Alice');
            expect(result[0].value).toBe('Bob');
            
            // 确认 timestamp 变更被过滤掉了
            const timestampChange = result.find(c => c.path === '$.timestamp');
            expect(timestampChange).toBeUndefined();
        });

        it('应该过滤掉多个元数据字段', () => {
            const obj1 = { 
                name: 'Alice', 
                age: 25, 
                timestamp: 1000,
                version: 'v1',
                updatedBy: 'system'
            };
            const obj2 = { 
                name: 'Bob', 
                age: 25, 
                timestamp: 2000,
                version: 'v2',
                updatedBy: 'admin'
            };
            
            const result = findDifferences(obj1, obj2, { 
                metadataFields: ['timestamp', 'version', 'updatedBy'] 
            });
            
            expect(result).toHaveLength(1);
            expect(result[0].path).toBe('$.name');
        });

        it('应该正确处理空对象', () => {
            const obj1 = {};
            const obj2 = { name: 'Alice' };
            
            const result = findDifferences(obj1, obj2);
            
            expect(result).toHaveLength(1);
            expect(result[0].type).toBe('ADD');
            expect(result[0].path).toBe('$.name');
            expect(result[0].value).toBe('Alice');
        });

        it('应该正确处理相同的对象', () => {
            const obj1 = { 
                name: 'Alice', 
                age: 25, 
                tags: ['developer', 'javascript'],
                profile: { city: 'New York' }
            };
            const obj2 = { 
                name: 'Alice', 
                age: 25, 
                tags: ['developer', 'javascript'],
                profile: { city: 'New York' }
            };
            
            const result = findDifferences(obj1, obj2);
            
            expect(result).toHaveLength(0);
        });

        it('应该处理undefined和null的差异', () => {
            const obj1 = { value: undefined as any };
            const obj2 = { value: null as any };
            
            const result = findDifferences(obj1, obj2);
            
            expect(result.length).toBeGreaterThan(0);
            
            // 查找与 value 字段相关的变更
            const valueChanges = result.filter(c => c.path === '$.value');
            expect(valueChanges.length).toBeGreaterThan(0);
            
            // 应该有涉及 null 值的变更
            const nullChange = valueChanges.find(c => c.value === null);
            expect(nullChange).toBeDefined();
        });

        it('应该处理日期对象的差异', () => {
            const date1 = new Date('2023-01-01');
            const date2 = new Date('2023-01-02');
            const obj1 = { createdAt: date1 };
            const obj2 = { createdAt: date2 };
            
            const result = findDifferences(obj1, obj2);
            
            expect(result).toHaveLength(1);
            expect(result[0].type).toBe('UPDATE');
            expect(result[0].path).toBe('$.createdAt');
            expect(result[0].oldValue).toEqual(date1);
            expect(result[0].value).toEqual(date2);
        });

        it('应该处理仅有元数据字段变化的情况', () => {
            const obj1 = { name: 'Alice', timestamp: 1000 };
            const obj2 = { name: 'Alice', timestamp: 2000 };
            
            const result = findDifferences(obj1, obj2, { metadataFields: ['timestamp'] });
            
            expect(result).toHaveLength(0);
        });

        it('应该处理空的metadataFields配置', () => {
            const obj1 = { name: 'Alice', age: 25 };
            const obj2 = { name: 'Bob', age: 26 };
            
            const result = findDifferences(obj1, obj2, { metadataFields: [] });
            
            expect(result).toHaveLength(2);
        });

        it('应该在没有metadataFields时返回所有变更', () => {
            const obj1 = { name: 'Alice', age: 25 };
            const obj2 = { name: 'Bob', age: 26 };
            
            const result = findDifferences(obj1, obj2);
            
            expect(result).toHaveLength(2);
        });
    });

    describe('hasDiff', () => {
        it('应该在有变更时返回true', () => {
            const changes: IAtomicChange[] = [
                { 
                    type: 'UPDATE' as any, 
                    key: 'name', 
                    path: '$.name', 
                    valueType: 'String',
                    oldValue: 'Alice', 
                    value: 'Bob' 
                }
            ];
            
            expect(hasDiff(changes)).toBe(true);
        });

        it('应该在没有变更时返回false', () => {
            const changes: IAtomicChange[] = [];
            
            expect(hasDiff(changes)).toBe(false);
        });
    });

    describe('getMetadataChanges', () => {
        it('应该正确提取元数据字段变更', () => {
            const obj1 = { name: 'Alice', age: 25, timestamp: 1000 };
            const obj2 = { name: 'Bob', age: 25, timestamp: 2000 };
            
            const metadata = getMetadataChanges(obj1, obj2, { metadataFields: ['timestamp'] });
            
            expect(metadata).toEqual({
                timestamp: {
                    value1: 1000,
                    value2: 2000
                }
            });
        });

        it('应该正确提取多个元数据字段变更', () => {
            const obj1 = { 
                name: 'Alice', 
                timestamp: 1000,
                version: 'v1',
                updatedBy: 'system'
            };
            const obj2 = { 
                name: 'Bob', 
                timestamp: 2000,
                version: 'v2',
                updatedBy: 'admin'
            };
            
            const metadata = getMetadataChanges(obj1, obj2, { 
                metadataFields: ['timestamp', 'version', 'updatedBy'] 
            });
            
            expect(metadata).toEqual({
                timestamp: { value1: 1000, value2: 2000 },
                version: { value1: 'v1', value2: 'v2' },
                updatedBy: { value1: 'system', value2: 'admin' }
            });
        });

        it('应该在没有元数据字段时返回空对象', () => {
            const obj1 = { name: 'Alice', age: 25 };
            const obj2 = { name: 'Bob', age: 26 };
            
            const metadata = getMetadataChanges(obj1, obj2, { metadataFields: [] });
            
            expect(metadata).toEqual({});
        });

        it('应该在没有差异时返回空对象', () => {
            const obj1 = { name: 'Alice', timestamp: 1000 };
            const obj2 = { name: 'Alice', timestamp: 1000 };
            
            const metadata = getMetadataChanges(obj1, obj2, { metadataFields: ['timestamp'] });
            
            expect(metadata).toEqual({});
        });
    });

    describe('类型安全性', () => {
        interface User {
            id: string;
            name: string;
            age: number;
        }

        it('应该保持类型安全', () => {
            const user1: User = { id: '1', name: 'Alice', age: 25 };
            const user2: User = { id: '1', name: 'Bob', age: 26 };
            
            const result = findDifferences(user1, user2);
            
            // TypeScript 应该推断出正确的类型
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
            expect(result[0]).toHaveProperty('type');
            expect(result[0]).toHaveProperty('path');
        });
    });

    describe('边界情况', () => {
        it('应该处理非常大的对象', () => {
            const largeObj1: any = {};
            const largeObj2: any = {};
            
            // 创建包含1000个属性的对象
            for (let i = 0; i < 1000; i++) {
                largeObj1[`prop${i}`] = `value${i}`;
                largeObj2[`prop${i}`] = i < 500 ? `value${i}` : `changed${i}`;
            }
            
            const result = findDifferences(largeObj1, largeObj2);
            
            expect(result.length).toBe(500);
        });

        it('应该处理深层嵌套的对象', () => {
            let deepObj1: any = { level: 0 };
            let deepObj2: any = { level: 0 };
            let current1 = deepObj1;
            let current2 = deepObj2;
            
            // 创建10层嵌套
            for (let i = 1; i <= 10; i++) {
                current1.nested = { level: i, data: `level${i}` };
                current2.nested = { level: i, data: i === 10 ? 'changed' : `level${i}` };
                current1 = current1.nested;
                current2 = current2.nested;
            }
            
            const result = findDifferences(deepObj1, deepObj2);
            
            expect(result.length).toBeGreaterThan(0);
            
            // 查找深层变更
            const deepChange = result.find(c => c.path.includes('nested') && c.value === 'changed');
            expect(deepChange).toBeDefined();
        });

        it('应该处理循环引用（预期抛出错误）', () => {
            const obj1: any = { name: 'test' };
            obj1.self = obj1;
            
            const obj2: any = { name: 'test' };
            obj2.self = obj2;
            
            // json-diff-ts 不支持循环引用，应该抛出错误
            expect(() => {
                const result = findDifferences(obj1, obj2);
            }).toThrow();
        });
    });

    describe('实际使用场景模拟', () => {
        it('应该模拟Twitter用户数据比较场景', () => {
            const userResults1 = {
                user: {
                    restId: '123456789',
                    legacy: {
                        name: 'John Doe',
                        screenName: 'johndoe',
                        description: 'Software Developer',
                        followersCount: 1000,
                        friendsCount: 500,
                        profileImageUrl: 'https://example.com/old.jpg'
                    }
                },
                ts: 1640995200000
            };

            const userResults2 = {
                user: {
                    restId: '123456789',
                    legacy: {
                        name: 'John Doe',
                        screenName: 'johndoe',
                        description: 'Senior Software Developer',
                        followersCount: 1200,
                        friendsCount: 520,
                        profileImageUrl: 'https://example.com/new.jpg'
                    }
                },
                ts: 1640995260000
            };

            const result = findDifferences(userResults1, userResults2, { 
                metadataFields: ['ts'] 
            });

            expect(result.length).toBeGreaterThan(0);
            expect(hasDiff(result)).toBe(true);
            
            // 检查具体的变更
            const descriptionChange = result.find(c => c.path === '$.user.legacy.description');
            expect(descriptionChange).toBeDefined();
            expect(descriptionChange!.oldValue).toBe('Software Developer');
            expect(descriptionChange!.value).toBe('Senior Software Developer');
            
            // 检查元数据
            const metadata = getMetadataChanges(userResults1, userResults2, { 
                metadataFields: ['ts'] 
            });
            expect(metadata).toEqual({
                ts: {
                    value1: 1640995200000,
                    value2: 1640995260000
                }
            });
        });

        it('应该模拟配置文件更新场景', () => {
            const config1 = {
                database: {
                    host: 'localhost',
                    port: 5432,
                    name: 'myapp'
                },
                features: {
                    darkMode: true,
                    notifications: false
                },
                version: '1.0.0',
                lastUpdated: new Date('2023-01-01')
            };

            const config2 = {
                database: {
                    host: 'production.db.com',
                    port: 5432,
                    name: 'myapp'
                },
                features: {
                    darkMode: true,
                    notifications: true,
                    newFeature: true
                },
                version: '1.1.0',
                lastUpdated: new Date('2023-01-15')
            };

            const result = findDifferences(config1, config2, {
                metadataFields: ['version', 'lastUpdated']
            });

            expect(result.length).toBeGreaterThan(0);
            
            // 检查具体变更
            const hostChange = result.find(c => c.path === '$.database.host');
            expect(hostChange).toBeDefined();
            expect(hostChange!.oldValue).toBe('localhost');
            expect(hostChange!.value).toBe('production.db.com');
            
            const notificationsChange = result.find(c => c.path === '$.features.notifications');
            expect(notificationsChange).toBeDefined();
            expect(notificationsChange!.oldValue).toBe(false);
            expect(notificationsChange!.value).toBe(true);
            
            // 检查新增的功能
            const newFeatureChange = result.find(c => c.path === '$.features.newFeature');
            expect(newFeatureChange).toBeDefined();
            expect(newFeatureChange!.type).toBe('ADD');
            expect(newFeatureChange!.value).toBe(true);
            
            // 检查元数据
            const metadata = getMetadataChanges(config1, config2, {
                metadataFields: ['version', 'lastUpdated']
            });
            expect(metadata.version).toBeDefined();
            expect(metadata.lastUpdated).toBeDefined();
        });
    });
}); 