console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'EXISTS' : 'NOT SET');
console.log('PGHOST:', process.env.PGHOST ? 'EXISTS' : 'NOT SET');
console.log('PGUSER:', process.env.PGUSER ? 'EXISTS' : 'NOT SET');
console.log('PGDATABASE:', process.env.PGDATABASE ? 'EXISTS' : 'NOT SET');
console.log('All env keys:', Object.keys(process.env).filter(k => k.includes('PG') || k.includes('DATABASE')).join(', '));
