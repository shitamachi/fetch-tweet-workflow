import { diff, atomizeChangeset, IAtomicChange } from 'json-diff-ts';

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
 * 检查数组中是否包含指定元素
 * @param array 数组
 * @param item 要查找的元素
 * @returns 是否包含
 */
function arrayIncludes<T>(array: T[], item: T): boolean {
    for (let i = 0; i < array.length; i++) {
        if (array[i] === item) {
            return true;
        }
    }
    return false;
}

/**
 * 从 JSON path 中提取字段名
 * @param path JSON path 字符串 (如 "$.field" 或 "$.nested.field" 或 "$.array[0]")
 * @returns 字段名
 */
function extractFieldFromPath(path: string): string {
    // 移除 $ 前缀
    let cleanPath = path.replace(/^\$\.?/, '');
    
    // 如果是空字符串，返回空
    if (!cleanPath) {
        return '';
    }
    
    // 取第一个路径段，可能包含数组索引
    const firstSegment = cleanPath.split('.')[0];
    
    // 如果包含数组索引，只取数组名部分
    if (firstSegment.indexOf('[') !== -1) {
        return firstSegment.substring(0, firstSegment.indexOf('['));
    }
    
    return firstSegment;
}

/**
 * 根据 JSON path 获取对象中的值
 * @param obj 源对象
 * @param path JSON path
 * @returns 对应路径的值
 */
function getValueByPath(obj: any, path: string): any {
    try {
        const segments = path.replace(/^\$\.?/, '').split('.');
        let current = obj;
        
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            if (current === null || current === undefined) {
                return undefined;
            }
            // 处理数组索引
            if (segment.indexOf('[') !== -1 && segment.indexOf(']') !== -1) {
                const bracketIndex = segment.indexOf('[');
                const arrayKey = segment.substring(0, bracketIndex);
                const indexPart = segment.substring(bracketIndex + 1, segment.indexOf(']'));
                const index = parseInt(indexPart, 10);
                current = current[arrayKey];
                if (Array.isArray(current)) {
                    current = current[index];
                }
            } else {
                current = current[segment];
            }
        }
        
        return current;
    } catch (error) {
        return undefined;
    }
}

/**
 * 检查路径是否为嵌套路径
 * @param path JSON path
 * @returns 是否为嵌套路径
 */
function isNestedPath(path: string): boolean {
    const cleanPath = path.replace(/^\$\.?/, '');
    return cleanPath.indexOf('.') !== -1 || cleanPath.indexOf('[') !== -1;
}

/**
 * 比较两个对象并返回它们之间的原子化差异
 * @param obj1 第一个对象
 * @param obj2 第二个对象
 * @param options 配置选项
 * @returns IAtomicChange 数组，每个元素代表一个原子化的变更操作
 */
export function findDifferences<T extends object>(
    obj1: T,
    obj2: T,
    options: DiffOptions = {}
): IAtomicChange[] {
    const metadataFields = options.metadataFields || [];

    // 使用 json-diff-ts 计算差异
    const diffs = diff(obj1, obj2);
    
    if (!diffs) {
        // 没有差异
        return [];
    }

    // 将差异转换为原子化变更集
    const atomicChanges = atomizeChangeset(diffs);
    
    // 如果没有元数据字段配置，直接返回所有原子化变更
    if (metadataFields.length === 0) {
        return atomicChanges;
    }
    
    // 过滤掉元数据字段的变更
    const filteredChanges: IAtomicChange[] = [];
    
    for (let i = 0; i < atomicChanges.length; i++) {
        const change = atomicChanges[i];
        const fieldName = extractFieldFromPath(change.path);
        
        // 如果不是元数据字段，则包含在结果中
        if (!arrayIncludes(metadataFields, fieldName)) {
            filteredChanges.push(change);
        }
    }
    
    return filteredChanges;
}

/**
 * 检查是否有差异
 * @param changes 原子化变更数组
 * @returns 是否有差异
 */
export const hasDiff = (changes: IAtomicChange[]): boolean => changes.length > 0;

/**
 * 获取元数据字段的变更信息
 * @param obj1 第一个对象
 * @param obj2 第二个对象
 * @param options 配置选项
 * @returns 元数据字段的变更信息
 */
export function getMetadataChanges<T extends object>(
    obj1: T,
    obj2: T,
    options: DiffOptions = {}
): { [key: string]: { value1: any; value2: any } } {
    const metadataFields = options.metadataFields || [];
    const metadata: { [key: string]: { value1: any; value2: any } } = {};
    
    if (metadataFields.length === 0) {
        return metadata;
    }
    
    // 使用 json-diff-ts 计算差异
    const diffs = diff(obj1, obj2);
    
    if (!diffs) {
        return metadata;
    }

    // 将差异转换为原子化变更集
    const atomicChanges = atomizeChangeset(diffs);
    
    // 收集元数据字段的变更
    for (let i = 0; i < atomicChanges.length; i++) {
        const change = atomicChanges[i];
        const fieldName = extractFieldFromPath(change.path);
        
        // 如果是元数据字段
        if (arrayIncludes(metadataFields, fieldName)) {
            metadata[fieldName] = {
                value1: getValueByPath(obj1, change.path),
                value2: change.value
            };
        }
    }
    
    return metadata;
}