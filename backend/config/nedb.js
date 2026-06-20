const DataStore = require('@seald-io/nedb');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = {
  users: new DataStore({
    filename: path.join(dbDir, 'users.db'),
    autoload: true,
    timestampData: true
  }),
  orders: new DataStore({
    filename: path.join(dbDir, 'repair_orders.db'),
    autoload: true,
    timestampData: true
  })
};

db.users.ensureIndex({ fieldName: 'phone', unique: true, sparse: true }, (err) => {
  if (err) console.warn('用户手机号索引警告:', err.message);
});
db.users.ensureIndex({ fieldName: 'openid', unique: true, sparse: true }, (err) => {
  if (err) console.warn('用户openid索引警告:', err.message);
});
db.orders.ensureIndex({ fieldName: 'orderNo', unique: true }, (err) => {
  if (err) console.warn('工单号索引警告:', err.message);
});
db.orders.ensureIndex({ fieldName: 'owner' }, () => {});
db.orders.ensureIndex({ fieldName: 'worker' }, () => {});
db.orders.ensureIndex({ fieldName: 'status' }, () => {});

const findAll = (collection, query = {}) => {
  return new Promise((resolve, reject) => {
    collection.find(query, (err, docs) => {
      if (err) reject(err);
      else resolve(docs);
    });
  });
};

const find = (collection, query = {}, options = {}) => {
  return new Promise((resolve, reject) => {
    const { sort = { createdAt: -1 }, skip = 0, limit = 0 } = options;
    let cursor = collection.find(query).sort(sort);
    if (skip > 0) cursor = cursor.skip(skip);
    if (limit > 0) cursor = cursor.limit(limit);
    cursor.exec((err, docs) => {
      if (err) reject(err);
      else resolve(docs);
    });
  });
};

const findOne = (collection, query = {}) => {
  return new Promise((resolve, reject) => {
    collection.findOne(query, (err, doc) => {
      if (err) reject(err);
      else resolve(doc);
    });
  });
};

const findById = (collection, id) => {
  return new Promise((resolve, reject) => {
    collection.findOne({ _id: id }, (err, doc) => {
      if (err) reject(err);
      else resolve(doc);
    });
  });
};

const insert = (collection, doc) => {
  return new Promise((resolve, reject) => {
    collection.insert(doc, (err, newDoc) => {
      if (err) reject(err);
      else resolve(newDoc);
    });
  });
};

const update = (collection, query, update, options = {}) => {
  return new Promise((resolve, reject) => {
    collection.update(query, update, { ...options, returnUpdatedDocs: true }, (err, numAffected, affectedDocuments) => {
      if (err) reject(err);
      else resolve({ numAffected, affectedDocuments });
    });
  });
};

const updateById = (collection, id, updateObj, options = {}) => {
  return new Promise((resolve, reject) => {
    collection.update({ _id: id }, { $set: updateObj }, { ...options, returnUpdatedDocs: true }, (err, numAffected, affectedDocuments) => {
      if (err) reject(err);
      else resolve(affectedDocuments);
    });
  });
};

const remove = (collection, query, options = {}) => {
  return new Promise((resolve, reject) => {
    collection.remove(query, options, (err, numRemoved) => {
      if (err) reject(err);
      else resolve(numRemoved);
    });
  });
};

const count = (collection, query = {}) => {
  return new Promise((resolve, reject) => {
    collection.count(query, (err, count) => {
      if (err) reject(err);
      else resolve(count);
    });
  });
};

const populateUser = (doc, fields = 'name phone building room avatar skills workStatus status currentOrderCount') => {
  if (!doc) return doc;
  const fieldList = fields.split(' ');
  const result = {};
  fieldList.forEach(f => {
    if (doc[f] !== undefined) result[f] = doc[f];
  });
  result.id = doc._id;
  result._id = doc._id;
  return result;
};

const toObjectId = (id) => id;

module.exports = {
  db,
  findAll,
  find,
  findOne,
  findById,
  insert,
  update,
  updateById,
  remove,
  count,
  populateUser,
  toObjectId
};
