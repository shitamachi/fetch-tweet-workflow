import { findDifferences, hasDiff, Difference, DiffOptions, DiffResult } from './obj-diff';

describe('obj-diff', () => {
    describe('findDifferences', () => {
        it('应该检测到基本属性的差异', () => {
            const obj1 = { name: 'Alice', age: 25 };
            const obj2 = { name: 'Bob', age: 25 };
            
            const result = findDifferences(obj1, obj2);
            
            expect(result.differences).toHaveLength(1);
            expect(result.differences[0].field).toBe('name');
            expect(result.differences[0].value1).toBe('Alice');
            expect(result.differences[0].value2).toBe('Bob');
            expect(result.metadata).toEqual({});
        });

        it('应该检测到数值属性的差异', () => {
            const obj1 = { count: 10, price: 99.99 };
            const obj2 = { count: 15, price: 89.99 };
            
            const result = findDifferences(obj1, obj2);
            
            expect(result.differences).toHaveLength(2);
            expect(result.differences.find(d => d.field === 'count')).toEqual({
                field: 'count',
                value1: 10,
                value2: 15
            });
            expect(result.differences.find(d => d.field === 'price')).toEqual({
                field: 'price',
                value1: 99.99,
                value2: 89.99
            });
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
            
            expect(result.differences).toHaveLength(1);
            expect(result.differences[0].field).toBe('user');
            expect(result.differences[0].value1).toEqual(obj1.user);
            expect(result.differences[0].value2).toEqual(obj2.user);
        });

        it('应该检测到数组的差异', () => {
            const obj1 = { tags: ['javascript', 'react'] };
            const obj2 = { tags: ['javascript', 'vue', 'typescript'] };
            
            const result = findDifferences(obj1, obj2);
            
            expect(result.differences).toHaveLength(1);
            expect(result.differences[0].field).toBe('tags');
            expect(result.differences[0].value1).toEqual(['javascript', 'react']);
            expect(result.differences[0].value2).toEqual(['javascript', 'vue', 'typescript']);
        });

        it('应该检测到布尔值和null的差异', () => {
            const obj1 = { active: true, data: null };
            const obj2 = { active: false, data: 'something' };
            
            const result = findDifferences(obj1, obj2);
            
            expect(result.differences).toHaveLength(2);
            expect(result.differences.find(d => d.field === 'active')).toEqual({
                field: 'active',
                value1: true,
                value2: false
            });
            expect(result.differences.find(d => d.field === 'data')).toEqual({
                field: 'data',
                value1: null,
                value2: 'something'
            });
        });

        it('应该检测到添加的属性', () => {
            const obj1 = { name: 'Alice' };
            const obj2 = { name: 'Alice', age: 25, email: 'alice@example.com' };
            
            const result = findDifferences(obj1, obj2);
            
            expect(result.differences).toHaveLength(2);
            expect(result.differences.find(d => d.field === 'age')).toEqual({
                field: 'age',
                value1: undefined,
                value2: 25
            });
            expect(result.differences.find(d => d.field === 'email')).toEqual({
                field: 'email',
                value1: undefined,
                value2: 'alice@example.com'
            });
        });

        it('应该检测到删除的属性', () => {
            const obj1 = { name: 'Alice', age: 25, email: 'alice@example.com' };
            const obj2 = { name: 'Alice' };
            
            const result = findDifferences(obj1, obj2);
            
            expect(result.differences).toHaveLength(2);
            expect(result.differences.find(d => d.field === 'age')).toEqual({
                field: 'age',
                value1: 25,
                value2: undefined
            });
            expect(result.differences.find(d => d.field === 'email')).toEqual({
                field: 'email',
                value1: 'alice@example.com',
                value2: undefined
            });
        });

        it('应该正确处理元数据字段', () => {
            const obj1 = { name: 'Alice', age: 25, timestamp: 1000 };
            const obj2 = { name: 'Bob', age: 25, timestamp: 2000 };
            
            const result = findDifferences(obj1, obj2, { metadataFields: ['timestamp'] });
            
            expect(result.differences).toHaveLength(1);
            expect(result.differences[0].field).toBe('name');
            expect(result.metadata).toEqual({
                timestamp: {
                    value1: 1000,
                    value2: 2000
                }
            });
        });

        it('应该正确处理多个元数据字段', () => {
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
            
            expect(result.differences).toHaveLength(1);
            expect(result.differences[0].field).toBe('name');
            expect(result.metadata).toEqual({
                timestamp: { value1: 1000, value2: 2000 },
                version: { value1: 'v1', value2: 'v2' },
                updatedBy: { value1: 'system', value2: 'admin' }
            });
        });

        it('应该处理复杂的嵌套结构', () => {
            const obj1 = {
                user: {
                    id: '123',
                    profile: {
                        name: 'Alice',
                        contact: {
                            email: 'alice@old.com',
                            phone: '123-456-7890'
                        },
                        preferences: ['dark-mode', 'notifications']
                    }
                },
                settings: { theme: 'dark' }
            };
            
            const obj2 = {
                user: {
                    id: '123',
                    profile: {
                        name: 'Alice Smith',
                        contact: {
                            email: 'alice@new.com',
                            phone: '123-456-7890'
                        },
                        preferences: ['dark-mode', 'notifications', 'auto-save']
                    }
                },
                settings: { theme: 'light', language: 'en' }
            };
            
            const result = findDifferences(obj1, obj2);
            
            expect(result.differences).toHaveLength(2);
            expect(result.differences.find(d => d.field === 'user')).toBeDefined();
            expect(result.differences.find(d => d.field === 'settings')).toBeDefined();
        });

        it('应该正确处理空对象', () => {
            const obj1 = {};
            const obj2 = { name: 'Alice' };
            
            const result = findDifferences(obj1, obj2);
            
            expect(result.differences).toHaveLength(1);
            expect(result.differences[0]).toEqual({
                field: 'name',
                value1: undefined,
                value2: 'Alice'
            });
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
            
            expect(result.differences).toHaveLength(0);
            expect(result.metadata).toEqual({});
        });

        it('应该处理undefined和null的差异', () => {
            const obj1 = { value: undefined };
            const obj2 = { value: null };
            
            const result = findDifferences(obj1, obj2);
            
            expect(result.differences).toHaveLength(1);
            expect(result.differences[0]).toEqual({
                field: 'value',
                value1: undefined,
                value2: null
            });
        });

        it('应该处理日期对象的差异', () => {
            const date1 = new Date('2023-01-01');
            const date2 = new Date('2023-01-02');
            const obj1 = { createdAt: date1 };
            const obj2 = { createdAt: date2 };
            
            const result = findDifferences(obj1, obj2);
            
            expect(result.differences).toHaveLength(1);
            expect(result.differences[0]).toEqual({
                field: 'createdAt',
                value1: date1,
                value2: date2
            });
        });

        it('应该处理数组对象的复杂差异', () => {
            const obj1 = {
                users: [
                    { id: 1, name: 'Alice' },
                    { id: 2, name: 'Bob' }
                ]
            };
            const obj2 = {
                users: [
                    { id: 1, name: 'Alice Smith' },
                    { id: 2, name: 'Bob' },
                    { id: 3, name: 'Charlie' }
                ]
            };
            
            const result = findDifferences(obj1, obj2);
            
            expect(result.differences).toHaveLength(1);
            expect(result.differences[0].field).toBe('users');
            expect(result.differences[0].value1).toEqual(obj1.users);
            expect(result.differences[0].value2).toEqual(obj2.users);
        });

        it('应该处理仅有元数据字段变化的情况', () => {
            const obj1 = { name: 'Alice', timestamp: 1000 };
            const obj2 = { name: 'Alice', timestamp: 2000 };
            
            const result = findDifferences(obj1, obj2, { metadataFields: ['timestamp'] });
            
            expect(result.differences).toHaveLength(0);
            expect(result.metadata).toEqual({
                timestamp: {
                    value1: 1000,
                    value2: 2000
                }
            });
        });

        it('应该处理空的metadataFields配置', () => {
            const obj1 = { name: 'Alice', age: 25 };
            const obj2 = { name: 'Bob', age: 26 };
            
            const result = findDifferences(obj1, obj2, { metadataFields: [] });
            
            expect(result.differences).toHaveLength(2);
            expect(result.metadata).toEqual({});
        });
    });

    describe('hasDiff', () => {
        it('应该在有差异时返回true', () => {
            const diffResult: DiffResult<any> = {
                differences: [
                    { field: 'name', value1: 'Alice', value2: 'Bob' }
                ],
                metadata: {}
            };
            
            expect(hasDiff(diffResult)).toBe(true);
        });

        it('应该在没有差异时返回false', () => {
            const diffResult: DiffResult<any> = {
                differences: [],
                metadata: {}
            };
            
            expect(hasDiff(diffResult)).toBe(false);
        });

        it('应该在有元数据但没有差异时返回false', () => {
            const diffResult: DiffResult<any> = {
                differences: [],
                metadata: {
                    timestamp: { value1: 1000, value2: 2000 }
                }
            };
            
            expect(hasDiff(diffResult)).toBe(false);
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
            const firstDiff = result.differences[0];
            expect(typeof firstDiff.field).toBe('string');
            expect(['id', 'name', 'age']).toContain(firstDiff.field);
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
            
            expect(result.differences.length).toBe(500);
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
            
            expect(result.differences).toHaveLength(1);
            expect(result.differences[0].field).toBe('nested');
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

            expect(result.differences).toHaveLength(1);
            expect(result.differences[0].field).toBe('user');
            expect(result.metadata).toEqual({
                ts: {
                    value1: 1640995200000,
                    value2: 1640995260000
                }
            });
            expect(hasDiff(result)).toBe(true);
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

            expect(result.differences).toHaveLength(2);
            expect(result.differences.find(d => d.field === 'database')).toBeDefined();
            expect(result.differences.find(d => d.field === 'features')).toBeDefined();
            expect(result.metadata.version).toBeDefined();
            expect(result.metadata.lastUpdated).toBeDefined();
        });
    });
}); 