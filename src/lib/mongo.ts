import { Collection, Db, MongoClient, Document, Filter, Sort } from 'mongodb';

type QueryOptions = {
  where?: Record<string, any>;
  include?: Record<string, any>;
  select?: Record<string, boolean>;
  orderBy?: Record<string, 'asc' | 'desc'> | Array<Record<string, 'asc' | 'desc'>>;
  take?: number;
};

const uri = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/studyflow';
const dbName = process.env.MONGODB_DB || 'studyflow';

const globalForMongo = globalThis as unknown as { mongoClient?: MongoClient; mongoDb?: Db };

export function mongoUriIsValid() {
  return /^mongodb(?:\+srv)?:\/\//i.test(uri);
}

async function getDb(): Promise<Db> {
  if (!globalForMongo.mongoClient) {
    globalForMongo.mongoClient = new MongoClient(uri);
    await globalForMongo.mongoClient.connect();
  }
  globalForMongo.mongoDb ??= globalForMongo.mongoClient.db(dbName);
  return globalForMongo.mongoDb;
}

function generateId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function stripNested(data: Record<string, any>) {
  if (!data) return {};
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!['create', 'createMany', 'update', 'connect', 'connectOrCreate', 'delete', 'set'].includes(key)
      && typeof value !== 'object') {
      result[key] = value;
    } else if (typeof value !== 'object' || value === null) {
      result[key] = value;
    } else if (!('create' in value || 'createMany' in value || 'update' in value)) {
      result[key] = value;
    }
  }
  return result;
}

function whereFilter(where: Record<string, any> = {}): Filter<Document> {
  const filter: Record<string, any> = {};

  for (const [key, value] of Object.entries(where)) {
    if (key === 'OR' && Array.isArray(value)) {
      filter.$or = value.map((item) => whereFilter(item));
      continue;
    }
    if (key === 'AND' && Array.isArray(value)) {
      filter.$and = value.map((item) => whereFilter(item));
      continue;
    }
    if (value === null) {
      filter[key] = null;
    } else if (value instanceof Date) {
      filter[key] = value;
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      const operators: Record<string, any> = {};
      if ('equals' in value) operators.$eq = value.equals;
      if ('not' in value) operators.$ne = value.not;
      if ('in' in value) operators.$in = value.in;
      if ('notIn' in value) operators.$nin = value.notIn;
      if ('gt' in value) operators.$gt = value.gt;
      if ('gte' in value) operators.$gte = value.gte;
      if ('lt' in value) operators.$lt = value.lt;
      if ('lte' in value) operators.$lte = value.lte;
      if ('contains' in value) operators.$regex = value.contains.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if ('startsWith' in value) operators.$regex = `^${value.startsWith.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`;
      filter[key] = operators;
    } else {
      filter[key] = value;
    }
  }
  return filter as Filter<Document>;
}

function orderSort(orderBy?: QueryOptions['orderBy']): Sort | undefined {
  if (!orderBy) return undefined;
  const sort: Record<string, 1 | -1> = {};
  const entries = Array.isArray(orderBy) ? orderBy : [orderBy];
  for (const entry of entries) {
    for (const [key, direction] of Object.entries(entry)) sort[key] = direction === 'desc' ? -1 : 1;
  }
  return sort;
}

function applySelect(document: Document, select?: Record<string, boolean>): Document {
  if (!select) return document;
  const selected: Document = {};
  for (const [key, enabled] of Object.entries(select)) {
    if (enabled && key in document) selected[key] = document[key];
  }
  return selected;
}

function collectionName(model: string) {
  const names: Record<string, string> = {
    teamMember: 'teamMembers',
    taskAssignee: 'taskAssignees',
    taskLabel: 'taskLabels',
    projectSnapshot: 'projectSnapshots',
    calendarToken: 'calendarTokens',
    fileVersion: 'fileVersions',
    trainingEnrollment: 'trainingEnrollments',
    trainingResource: 'trainingResources',
    coachingSession: 'coachingSessions',
    coachingGoal: 'coachingGoals',
    skillLevel: 'skillLevels',
  };
  return names[model] || `${model}s`;
}

async function collection(model: string): Promise<Collection<Document>> {
  return (await getDb()).collection(collectionName(model));
}

async function hydrate(document: Document, model: string, include?: Record<string, any>): Promise<Document> {
  if (!document || !include) return document;
  const result = { ...document };

  for (const [key, spec] of Object.entries(include)) {
    if (spec === false) continue;
    const nested = typeof spec === 'object' ? spec : undefined;

    if (key === 'teamMembers') result.teamMembers = await findMany('teamMember', { where: { userId: document.id }, ...(nested || {}) });
    else if (key === 'members') result.members = await findMany('teamMember', { where: { teamId: document.id }, ...(nested || {}) });
    else if (key === 'projects') result.projects = await findMany('project', { where: { teamId: document.id }, ...(nested || {}) });
    else if (key === 'columns') result.columns = await findMany('column', { where: { projectId: document.id }, ...(nested || {}) });
    else if (key === 'tasks') result.tasks = await findMany('task', { where: { projectId: document.id }, ...(nested || {}) });
    else if (key === 'subtasks') result.subtasks = await findMany('subtask', { where: { taskId: document.id }, ...(nested || {}) });
    else if (key === 'assignees') result.assignees = await findMany('taskAssignee', { where: { taskId: document.id }, ...(nested || {}) });
    else if (key === 'labels') result.labels = await findMany('taskLabel', { where: { taskId: document.id }, ...(nested || {}) });
    else if (key === 'versions') result.versions = await findMany('fileVersion', { where: { fileId: document.id }, ...(nested || {}) });
    else if (key === 'enrollments') result.enrollments = await findMany('trainingEnrollment', { where: { trainingId: document.id }, ...(nested || {}) });
    else if (key === 'resources') result.resources = await findMany('trainingResource', { where: { trainingId: document.id }, ...(nested || {}) });
    else if (key === 'messages') result.messages = await findMany('message', { where: { channelId: document.id }, ...(nested || {}) });
    else if (key === 'activities') result.activities = await findMany('activity', { where: { projectId: document.id }, ...(nested || {}) });
    else if (key === 'team') result.team = await findUnique('team', { id: document.teamId }, nested);
    else if (key === 'project') result.project = await findUnique('project', { id: document.projectId }, nested);
    else if (key === 'column') result.column = await findUnique('column', { id: document.columnId }, nested);
    else if (key === 'creator') result.creator = await findUnique('user', { id: document.createdById }, nested);
    else if (key === 'trainer') result.trainer = await findUnique('user', { id: document.trainerId }, nested);
    else if (key === 'coach') result.coach = await findUnique('user', { id: document.coachId }, nested);
    else if (key === 'coachee') result.coachee = await findUnique('user', { id: document.coacheeId }, nested);
    else if (key === 'uploader') result.uploader = await findUnique('user', { id: document.uploaderId }, nested);
    else if (key === 'author') result.author = await findUnique('user', { id: document.authorId }, nested);
    else if (key === 'user') result.user = await findUnique('user', { id: document.userId }, nested);
    else if (key === 'label') result.label = await findUnique('label', { id: document.labelId }, nested);
  }
  return result;
}

async function createNested(parentModel: string, parent: Document, data: Record<string, any>) {
  if (!data) return;
  for (const [key, value] of Object.entries(data)) {
    if (!value || typeof value !== 'object') continue;

    const createValue = 'create' in value ? value.create : null;
    const createManyValue = 'createMany' in value ? value.createMany?.data : null;

    if (key === 'members' || key === 'teamMembers') {
      const rows = createManyValue || (Array.isArray(createValue) ? createValue : [createValue]).filter(Boolean);
      for (const row of rows) await create('teamMember', { data: { ...row, teamId: parent.id } });
    } else if (key === 'projects') {
      const rows = createManyValue || (Array.isArray(createValue) ? createValue : [createValue]).filter(Boolean);
      for (const row of rows) await create('project', { data: { ...row, teamId: parent.id } });
    } else if (key === 'columns') {
      const rows = createManyValue || (Array.isArray(createValue) ? createValue : [createValue]).filter(Boolean);
      for (const row of rows) await create('column', { data: { ...row, projectId: parent.id } });
    } else if (key === 'subtasks') {
      const rows = createManyValue || (Array.isArray(createValue) ? createValue : [createValue]).filter(Boolean);
      for (const row of rows) await create('subtask', { data: { ...row, taskId: parent.id } });
    } else if (key === 'assignees') {
      const rows = createManyValue || (Array.isArray(createValue) ? createValue : [createValue]).filter(Boolean);
      for (const row of rows) await create('taskAssignee', { data: { ...row, taskId: parent.id } });
    } else if (key === 'labels') {
      const rows = createManyValue || (Array.isArray(createValue) ? createValue : [createValue]).filter(Boolean);
      for (const row of rows) await create('taskLabel', { data: { ...row, taskId: parent.id } });
    } else if (key === 'versions') {
      const rows = createManyValue || (Array.isArray(createValue) ? createValue : [createValue]).filter(Boolean);
      for (const row of rows) await create('fileVersion', { data: { ...row, fileId: parent.id } });
    }
  }
}

async function findMany(model: string, options: QueryOptions = {}): Promise<any[]> {
  const coll = await collection(model);
  let cursor = coll.find(whereFilter(options.where));
  const sort = orderSort(options.orderBy);
  if (sort) cursor = cursor.sort(sort);
  if (options.take) cursor = cursor.limit(options.take);
  const documents = await cursor.toArray();
  const hydrated = await Promise.all(documents.map((document) => hydrate(document, model, options.include)));
  return hydrated.map((document) => applySelect(document, options.select));
}

async function findUnique(model: string, where: Record<string, any>, options: any = {}): Promise<any | null> {
  const coll = await collection(model);
  const document = await coll.findOne(whereFilter(where));
  return document ? hydrate(document, model, options.include).then((value) => applySelect(value, options.select)) : null;
}

async function findFirst(model: string, options: QueryOptions = {}): Promise<Document | null> {
  const results = await findMany(model, { ...options, take: 1 });
  return results[0] || null;
}

async function create(model: string, args: { data: Record<string, any>; include?: Record<string, any>; select?: Record<string, boolean> }): Promise<Document> {
  const coll = await collection(model);
  const data = stripNested(args.data);
  const document = {
    id: data.id || generateId(model),
    createdAt: data.createdAt || new Date(),
    ...data,
  };
  await coll.insertOne(document);
  await createNested(model, document, args.data);
  const hydrated = await hydrate(document, model, args.include);
  return applySelect(hydrated, args.select);
}

async function createMany(model: string, args: { data: Array<Record<string, any>> }): Promise<{ count: number }> {
  if (!args.data.length) return { count: 0 };
  const coll = await collection(model);
  const documents = args.data.map((data) => ({
    id: data.id || generateId(model),
    createdAt: data.createdAt || new Date(),
    ...stripNested(data),
  }));
  const result = await coll.insertMany(documents);
  return { count: result.insertedCount };
}

async function update(model: string, args: { where: Record<string, any>; data: Record<string, any>; include?: Record<string, any>; select?: Record<string, boolean> }): Promise<Document> {
  const coll = await collection(model);
  const $set: Record<string, any> = {};
  for (const [key, value] of Object.entries(args.data)) {
    if (value !== undefined && typeof value !== 'object') $set[key] = value;
    else if (value !== undefined && value !== null && !('create' in value)) $set[key] = value;
  }
  await coll.updateOne(whereFilter(args.where), { $set });
  const document = await coll.findOne(whereFilter(args.where));
  if (!document) throw new Error(`${model} not found`);
  await createNested(model, document, args.data);
  const hydrated = await hydrate(document, model, args.include);
  return applySelect(hydrated, args.select);
}

async function updateMany(model: string, args: { where: Record<string, any>; data: Record<string, any> }): Promise<{ count: number }> {
  const coll = await collection(model);
  const $set: Record<string, any> = {};
  for (const [key, value] of Object.entries(args.data)) if (value !== undefined) $set[key] = value;
  const result = await coll.updateMany(whereFilter(args.where), { $set });
  return { count: result.modifiedCount };
}

async function deleteOne(model: string, args: { where: Record<string, any>; include?: Record<string, any> }): Promise<Document> {
  const coll = await collection(model);
  const document = await coll.findOne(whereFilter(args.where));
  if (!document) throw new Error(`${model} not found`);
  await coll.deleteOne(whereFilter(args.where));
  return document;
}

async function deleteMany(model: string, args: { where?: Record<string, any> } = {}): Promise<{ count: number }> {
  const coll = await collection(model);
  const result = await coll.deleteMany(whereFilter(args.where));
  return { count: result.deletedCount };
}

async function upsert(model: string, args: { where: Record<string, any>; create: Record<string, any>; update: Record<string, any>; include?: Record<string, any> }): Promise<Document> {
  const coll = await collection(model);
  const existing = await coll.findOne(whereFilter(args.where));
  if (existing) return update(model, { where: args.where, data: args.update, include: args.include });
  return create(model, { data: args.create, include: args.include });
}

async function aggregate(model: string, args: { where?: Record<string, any>; _sum?: Record<string, boolean> }) {
  const coll = await collection(model);
  const documents = await coll.find(whereFilter(args.where)).toArray();
  const _sum: Record<string, number | null> = {};
  for (const [key, enabled] of Object.entries(args._sum || {})) {
    if (!enabled) continue;
    const total = documents.reduce((sum, document) => sum + (typeof document[key] === 'number' ? document[key] : 0), 0);
    _sum[key] = documents.length ? total : null;
  }
  return { _sum };
}

function delegate(model: string) {
  return {
    findMany: (args: QueryOptions = {}) => findMany(model, args),
    findUnique: (args: { where: Record<string, any>; include?: Record<string, any>; select?: Record<string, boolean> }) => findUnique(model, args.where, args),
    findFirst: (args: QueryOptions = {}) => findFirst(model, args),
    create: (args: { data: Record<string, any>; include?: Record<string, any>; select?: Record<string, boolean> }) => create(model, args),
    createMany: (args: { data: Array<Record<string, any>> }) => createMany(model, args),
    update: (args: { where: Record<string, any>; data: Record<string, any>; include?: Record<string, any>; select?: Record<string, boolean> }) => update(model, args),
    updateMany: (args: { where: Record<string, any>; data: Record<string, any> }) => updateMany(model, args),
    delete: (args: { where: Record<string, any> }) => deleteOne(model, args),
    deleteMany: (args: { where?: Record<string, any> } = {}) => deleteMany(model, args),
    upsert: (args: { where: Record<string, any>; create: Record<string, any>; update: Record<string, any>; include?: Record<string, any> }) => upsert(model, args),
    aggregate: (args: { where?: Record<string, any>; _sum?: Record<string, boolean> }) => aggregate(model, args),
  };
}

type MongoDelegate = {
  findMany: (args?: QueryOptions) => Promise<any[]>;
  findUnique: (args: { where: Record<string, any>; include?: Record<string, any>; select?: Record<string, boolean> }) => Promise<any | null>;
  findFirst: (args?: QueryOptions) => Promise<any | null>;
  create: (args: { data: Record<string, any>; include?: Record<string, any>; select?: Record<string, boolean> }) => Promise<any>;
  createMany: (args: { data: Array<Record<string, any>> }) => Promise<{ count: number }>;
  update: (args: { where: Record<string, any>; data: Record<string, any>; include?: Record<string, any>; select?: Record<string, boolean> }) => Promise<any>;
  updateMany: (args: { where: Record<string, any>; data: Record<string, any> }) => Promise<{ count: number }>;
  delete: (args: { where: Record<string, any> }) => Promise<any>;
  deleteMany: (args?: { where?: Record<string, any> }) => Promise<{ count: number }>;
  upsert: (args: { where: Record<string, any>; create: Record<string, any>; update: Record<string, any>; include?: Record<string, any> }) => Promise<any>;
  aggregate: (args: { where?: Record<string, any>; _sum?: Record<string, boolean> }) => Promise<any>;
};

type MongoApi = Record<string, MongoDelegate> & {
  $disconnect: () => Promise<void>;
  $transaction: (operations: Promise<any>[]) => Promise<any[]>;
};

const modelNames = [
  'user', 'team', 'teamMember', 'project', 'column', 'projectTemplate', 'task', 'subtask',
  'label', 'taskAssignee', 'taskLabel', 'milestone', 'reminder', 'calendarToken', 'activity',
  'projectSnapshot', 'report', 'channel', 'message', 'notification', 'file', 'folder',
  'fileVersion', 'training', 'trainingEnrollment', 'trainingResource', 'coachingSession',
  'coachingGoal', 'skillLevel', 'feedback',
];

export const mongo = Object.fromEntries(modelNames.map((model) => [model, delegate(model)])) as MongoApi;

export const prisma = mongo;

export async function $disconnect() {
  if (globalForMongo.mongoClient) {
    await globalForMongo.mongoClient.close();
    globalForMongo.mongoClient = undefined;
    globalForMongo.mongoDb = undefined;
  }
}

(mongo as any).$disconnect = $disconnect;
(mongo as any).$transaction = async (operations: Promise<any>[]) => Promise.all(operations);
