const memory = new Map<string, string>();

const fallbackStorage = {
	getItem: (key: string) => memory.get(key) ?? null,
	setItem: (key: string, value: string) => memory.set(key, value),
	removeItem: (key: string) => memory.delete(key),
};

export const storage = typeof localStorage === 'undefined' ? fallbackStorage : localStorage;
