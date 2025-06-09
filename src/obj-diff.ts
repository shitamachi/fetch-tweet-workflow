// 定义一个通用的接口来表示对象差异
export interface Difference<T> {
    field: keyof T;
    value1: any;
    value2: any;
}

// 定义配置选项
export interface DiffOptions {
    metadataFields?: string[];
}

// 定义元数据类型
export interface DiffMetadata {
    [key: string]: {
        value1: any;
        value2: any;
    };
}

// 定义返回结果类型
export interface DiffResult<T> {
    differences: Difference<T>[];
    metadata: DiffMetadata;
}

/**
 * 比较两个对象并返回它们之间的差异
 * @param obj1 第一个对象
 * @param obj2 第二个对象
 * @param options 配置选项
 * @returns 包含差异信息和元数据的结果对象
 */
export function findDifferences<T extends object>(
    obj1: T,
    obj2: T,
    options: DiffOptions = {}
): DiffResult<T> {
    const differences: Difference<T>[] = [];
    const metadata: DiffMetadata = {};

    // 获取所有字段
    const allKeys = Object.keys(obj1) as Array<keyof T>;
    const metadataFields = options.metadataFields || [];

    // 遍历每个字段进行比较
    allKeys.forEach(key => {
        const value1 = obj1[key];
        const value2 = obj2[key];

        // 如果是元数据字段，添加到metadata中
        if (metadataFields.includes(key as string)) {
            metadata[key as string] = {
                value1,
                value2
            };
            return;
        }

        // 检查是否为对象类型
        if (typeof value1 === 'object' && typeof value2 === 'object' &&
            value1 !== null && value2 !== null &&
            !Array.isArray(value1) && !Array.isArray(value2)) {
            // 递归比较嵌套对象
            const nestedDiffs = findDifferences(value1, value2, options);
            if (nestedDiffs.differences.length > 0) {
                differences.push({
                    field: key,
                    value1: value1,
                    value2: value2
                });
            }
        }
        // 使用 JSON.stringify 来比较数组或普通值
        else if (JSON.stringify(value1) !== JSON.stringify(value2)) {
            differences.push({
                field: key,
                value1: value1,
                value2: value2
            });
        }
    });

    return {differences, metadata};
}

export const hasDiff = (diff: DiffResult<any>) => diff.differences.length > 0;