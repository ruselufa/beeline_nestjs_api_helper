export interface IDatabaseConfig {
	type: 'postgres';
	host: string;
	port: number;
	username: string;
	password: string;
	database: string;
	sslMode: string;
	pool?: {
		max: number;
		min: number;
		acquire: number;
		idle: number;
	};
	logging?:
		| boolean
		| 'all'
		| Array<'query' | 'schema' | 'error' | 'warn' | 'info' | 'log' | 'migration'>;
	extra?: {
		timestamps: boolean;
		underscored: boolean;
	};
}
