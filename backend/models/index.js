const { db, findAll, find, findOne, findById, insert, update, updateById, remove, count, populateUser, toObjectId } = require('../config/nedb');

const UserModel = {
  findOne: (query) => findOne(db.users, query),
  findById: (id) => findById(db.users, id),
  find: (query = {}, options = {}) => find(db.users, query, options),
  findAll: (query = {}) => findAll(db.users, query),
  count: (query = {}) => count(db.users, query),
  create: async (data) => {
    const doc = {
      openid: data.openid || undefined,
      phone: data.phone || undefined,
      password: data.password,
      name: data.name,
      avatar: data.avatar || '',
      role: data.role || 'owner',
      building: data.building || '',
      room: data.room || '',
      skills: data.skills || [],
      workStatus: data.workStatus || 'free',
      currentOrderCount: data.currentOrderCount || 0,
      status: data.status || 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const result = await insert(db.users, doc);
    return result;
  },
  save: async (doc) => {
    doc.updatedAt = new Date();
    if (!doc._id) {
      return await insert(db.users, doc);
    }
    const toUpdate = { ...doc };
    delete toUpdate._id;
    const result = await updateById(db.users, doc._id, toUpdate);
    return result;
  },
  findByIdAndUpdate: async (id, updateObj, options = {}) => {
    const toSet = { ...updateObj, updatedAt: new Date() };
    delete toSet._id;
    const result = await update(db.users, { _id: id }, { $set: toSet }, { returnUpdatedDocs: true });
    return result.affectedDocuments;
  },
  deleteSoft: async (id) => {
    return await updateById(db.users, id, { status: 'inactive', updatedAt: new Date() });
  },
  populate: (doc, fields) => populateUser(doc, fields)
};

const RepairOrderModel = {
  findOne: (query) => findOne(db.orders, query),
  findById: (id) => findById(db.orders, id),
  find: (query = {}, options = {}) => find(db.orders, query, options),
  findAll: (query = {}) => findAll(db.orders, query),
  count: (query = {}) => count(db.orders, query),
  create: async (data) => {
    const doc = {
      orderNo: data.orderNo,
      owner: data.owner,
      repairType: data.repairType,
      repairTypeName: data.repairTypeName,
      title: data.title,
      description: data.description,
      images: data.images || [],
      location: data.location || {},
      contact: data.contact || {},
      status: data.status || 'pending',
      worker: data.worker || null,
      assignedAt: data.assignedAt || null,
      assignedBy: data.assignedBy || null,
      startedAt: data.startedAt || null,
      completedAt: data.completedAt || null,
      closedAt: data.closedAt || null,
      repairResult: data.repairResult || null,
      priority: data.priority || 'medium',
      responseTime: data.responseTime || null,
      completionTime: data.completionTime || null,
      totalTime: data.totalTime || null,
      rating: data.rating || null,
      timeline: data.timeline || [],
      remark: data.remark || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const result = await insert(db.orders, doc);
    return result;
  },
  save: async (doc) => {
    doc.updatedAt = new Date();
    if (!doc._id) {
      return await insert(db.orders, doc);
    }
    const toUpdate = { ...doc };
    delete toUpdate._id;
    const result = await updateById(db.orders, doc._id, toUpdate);
    return result;
  },
  findByIdAndUpdate: async (id, updateObj, options = {}) => {
    const toSet = { ...updateObj, updatedAt: new Date() };
    delete toSet._id;
    const result = await update(db.orders, { _id: id }, { $set: toSet }, { returnUpdatedDocs: true });
    return result.affectedDocuments;
  }
};

const aggregateOrders = async (pipeline) => {
  const orders = await findAll(db.orders, {});
  const users = await findAll(db.users, {});
  const usersMap = {};
  users.forEach(u => { usersMap[u._id] = u; });

  let result = [...orders];

  for (const stage of pipeline) {
    if (stage.$match) {
      result = applyMatch(result, stage.$match);
    } else if (stage.$group) {
      result = applyGroup(result, stage.$group);
    } else if (stage.$sort) {
      result = applySort(result, stage.$sort);
    } else if (stage.$project) {
      result = applyProject(result, stage.$project, usersMap);
    } else if (stage.$lookup) {
      result = applyLookup(result, stage.$lookup, usersMap);
    } else if (stage.$unwind) {
      result = applyUnwind(result, stage.$unwind);
    }
  }

  return result;
};

const applyMatch = (data, match) => {
  return data.filter(item => {
    for (const key in match) {
      if (key === '$and' || key === '$or') continue;
      const cond = match[key];
      if (key === '$and') {
        const ok = cond.every(c => applyMatch([item], c).length > 0);
        if (!ok) return false;
        continue;
      }
      const value = getNested(item, key);
      if (cond instanceof Object && !Array.isArray(cond)) {
        for (const op in cond) {
          const cv = cond[op];
          const ok = evalCondition(value, op, cv, item);
          if (!ok) return false;
        }
      } else {
        if (Array.isArray(cond)) {
          if (!cond.includes(value)) return false;
        } else if (cond && cond.$regex) {
          const regex = new RegExp(cond.$regex, cond.$options || '');
          if (!regex.test(String(value || ''))) return false;
        } else {
          if (String(value) !== String(cond)) return false;
        }
      }
    }
    if (match.$and) {
      const ok = match.$and.every(c => applyMatch([item], c).length > 0);
      if (!ok) return false;
    }
    if (match.$or) {
      const ok = match.$or.some(c => applyMatch([item], c).length > 0);
      if (!ok) return false;
    }
    return true;
  });
};

const evalCondition = (value, op, cond, item) => {
  switch (op) {
    case '$exists':
      return cond ? value !== undefined && value !== null : value === undefined || value === null;
    case '$ne':
      if (cond === undefined) return value !== undefined;
      return value !== cond;
    case '$gte':
      return new Date(value) >= new Date(cond);
    case '$lte':
      return new Date(value) <= new Date(cond);
    case '$in':
      return cond.includes(value);
    case '$nin':
      return !cond.includes(value);
    case '$regex':
      return new RegExp(cond, 'i').test(String(value || ''));
    case '$eq':
      return value === cond;
    default:
      return value === cond;
  }
};

const getNested = (obj, path) => {
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
};

const applyGroup = (data, group) => {
  const groups = {};
  const getGroupKey = (item, idDef) => {
    if (idDef === null || idDef === undefined) return '__all__';
    if (typeof idDef === 'string' && idDef.startsWith('$')) {
      const val = getNested(item, idDef.slice(1));
      if (val instanceof Date) {
        return val.toISOString().slice(0, 10);
      }
      if (val === undefined || val === null) return '__null__';
      return String(val);
    }
    if (typeof idDef === 'object') {
      for (const k in idDef) {
        const def = idDef[k];
        if (def.$dateToString) {
          const dt = getNested(item, def.$dateToString.date.slice(1));
          return new Date(dt).toISOString().slice(0, 10);
        }
      }
    }
    return '__all__';
  };

  for (const item of data) {
    const key = getGroupKey(item, group._id);
    if (!groups[key]) groups[key] = { _items: [] };
    groups[key]._items.push(item);
  }

  const result = [];
  for (const key in groups) {
    const groupData = groups[key];
    const aggregated = {};
    if (group._id === null || group._id === undefined) {
      aggregated._id = null;
    } else {
      aggregated._id = key === '__null__' ? null : (key === '__all__' ? null : key);
    }
    for (const field in group) {
      if (field === '_id') continue;
      const op = group[field];
      if (typeof op === 'object') {
        if (op.$sum !== undefined) {
          if (typeof op.$sum === 'number') {
            aggregated[field] = groupData._items.length * op.$sum;
          } else if (typeof op.$sum === 'object') {
            if (op.$sum.$cond) {
              const [cond, trueVal, falseVal] = op.$sum.$cond;
              aggregated[field] = groupData._items.reduce((sum, it) => {
                let ok = true;
                if (cond.$in) {
                  const [valArr, ref] = cond.$in;
                  const v = getNested(it, ref.slice(1));
                  ok = valArr.includes(v);
                }
                return sum + (ok ? trueVal : falseVal);
              }, 0);
            } else if (op.$sum.$map) {
              aggregated[field] = groupData._items.reduce((sum, it) => {
                const input = op.$sum.$map.input;
                const filter = input.$filter;
                let arr = getNested(it, filter.input.slice(1));
                if (filter.cond) {
                  const [cond] = filter.cond;
                  arr = arr.filter(x => {
                    for (const ck in cond) {
                      if (cond[ck] !== undefined) return false;
                    }
                    return true;
                  });
                }
                const inMap = op.$sum.$map;
                if (inMap && inMap.in) {
                  const inField = inMap.in;
                  if (typeof inField === 'string' && inField.startsWith('$')) {
                    const f = inField.slice(1);
                    let inArr = getNested(it, f.split('.').slice(1).join('.'));
                    if (Array.isArray(inArr)) {
                      return sum + inArr.reduce((s, xx) => {
                        const inner = inMap.in;
                        if (typeof inner === 'string' && inner.startsWith('$')) {
                          const innerField = inner.slice(1).split('.').slice(1).join('.');
                          return s + (xx[innerField] || 0);
                        }
                        return s;
                      }, 0);
                    }
                  }
                }
                return sum;
              }, 0);
            }
          } else if (typeof op.$sum === 'string' && op.$sum.startsWith('$')) {
            const f = op.$sum.slice(1);
            aggregated[field] = groupData._items.reduce((sum, it) => sum + (Number(getNested(it, f)) || 0), 0);
          }
        } else if (op.$avg !== undefined) {
          const avgField = op.$avg;
          if (typeof avgField === 'string' && avgField.startsWith('$')) {
            const f = avgField.slice(1);
            const vals = groupData._items.map(it => getNested(it, f)).filter(v => v !== null && v !== undefined && !isNaN(Number(v)));
            if (vals.length === 0) {
              aggregated[field] = undefined;
            } else {
              aggregated[field] = vals.reduce((a, b) => a + Number(b), 0) / vals.length;
            }
          } else if (typeof avgField === 'object' && avgField.$map) {
            const m = avgField.$map;
            const filter = m.input.$filter;
            const vals = [];
            for (const it of groupData._items) {
              const rating = it.rating;
              if (rating && rating.score !== undefined) {
                vals.push(Number(rating.score));
              }
            }
            aggregated[field] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : undefined;
          }
        } else if (op.$size !== undefined) {
          if (typeof op.$size === 'string' && op.$size.startsWith('$')) {
            const f = op.$size.slice(1);
            const arr = getNested(groupData._items[0], f);
            if (Array.isArray(arr)) {
              aggregated[field] = arr.length;
            } else {
              aggregated[field] = groupData._items.length;
            }
          } else if (typeof op.$size === 'object' && op.$size.$filter) {
            const filter = op.$size.$filter;
            const cond = filter.cond;
            const filtered = groupData._items.filter(it => {
              for (const ck in cond) {
                if (ck === '$in') {
                  const [valArr, ref] = cond[ck];
                  const v = getNested(it, ref.slice(1));
                  if (!valArr.includes(v)) return false;
                }
              }
              return true;
            });
            aggregated[field] = filtered.length;
          }
        } else if (op.$arrayElemAt) {
          const [ref, idx] = op.$arrayElemAt;
          if (typeof ref === 'string' && ref.startsWith('$')) {
            const f = ref.slice(1);
            const arr = getNested(groupData._items[0], f);
            if (Array.isArray(arr)) {
              aggregated[field] = arr[idx];
            }
          }
        }
      } else {
        aggregated[field] = op;
      }
    }
    result.push(aggregated);
  }

  return result;
};

const applySort = (data, sort) => {
  const keys = Object.keys(sort);
  return data.sort((a, b) => {
    for (const k of keys) {
      const va = getNested(a, k);
      const vb = getNested(b, k);
      const cmp = va < vb ? -1 : (va > vb ? 1 : 0);
      if (cmp !== 0) return sort[k] * cmp;
    }
    return 0;
  });
};

const applyProject = (data, project, usersMap) => {
  return data.map(item => {
    const result = {};
    for (const key in project) {
      const def = project[key];
      if (key === '_id') {
        if (def === 0) continue;
        if (def === 1) result._id = item._id;
        else if (typeof def === 'string' && def.startsWith('$')) result._id = getNested(item, def.slice(1));
        else result._id = def;
      } else if (typeof def === 'string' && def.startsWith('$')) {
        const field = def.slice(1);
        if (field.startsWith('workerInfo.')) {
          const workerId = item._id;
          const info = usersMap[workerId];
          if (info) {
            if (!result.workerInfo) result.workerInfo = [];
            if (result.workerInfo.length === 0) {
              result.workerInfo.push({ name: info.name, phone: info.phone });
            }
          }
          const sub = field.split('.')[1];
          const arr = result.workerInfo || [];
          result[key] = arr[0] ? arr[0][sub] : undefined;
        } else if (field.startsWith('worker.')) {
          const workerId = item._id;
          const info = usersMap[workerId];
          const sub = field.split('.')[1];
          result[key] = info ? info[sub] : undefined;
        } else {
          result[key] = getNested(item, field);
        }
      } else if (def === 1) {
        result[key] = item[key];
      } else if (typeof def === 'object') {
        if (def.$arrayElemAt) {
          const [ref, idx] = def.$arrayElemAt;
          if (typeof ref === 'string' && ref.startsWith('$')) {
            const f = ref.slice(1);
            if (f === 'workerInfo') {
              const workerId = item._id;
              const info = usersMap[workerId];
              result[key] = info ? info.name : undefined;
            } else {
              const arr = getNested(item, f);
              result[key] = Array.isArray(arr) ? arr[idx] : undefined;
            }
          }
        } else {
          result[key] = def;
        }
      } else {
        result[key] = def;
      }
    }
    return result;
  });
};

const applyLookup = (data, lookup, usersMap) => {
  return data.map(item => {
    const result = { ...item };
    const local = getNested(item, lookup.localField);
    const arr = [];
    if (lookup.from === 'repairorders' || lookup.from === 'orders') {
      if (Array.isArray(lookup._orders)) {
        for (const o of lookup._orders) {
          if (String(o[lookup.foreignField]) === String(local)) {
            arr.push(o);
          }
        }
      }
    } else if (lookup.from === 'users') {
      const u = usersMap[local];
      if (u) arr.push(u);
    }
    result[lookup.as] = arr;
    return result;
  });
};

const applyUnwind = (data, unwind) => {
  const result = [];
  for (const item of data) {
    const field = typeof unwind === 'string' ? unwind.slice(1) : unwind.path.slice(1);
    const arr = getNested(item, field);
    if (Array.isArray(arr) && arr.length > 0) {
      for (const el of arr) {
        result.push({ ...item, [field]: el });
      }
    } else {
      result.push(item);
    }
  }
  return result;
};

const populateOrder = async (order, options = {}) => {
  if (!order) return null;
  const result = { ...order, id: order._id };
  if (order.owner) {
    const owner = await findById(db.users, order.owner);
    result.owner = populateUser(owner, options.ownerFields || 'name phone building room avatar');
  }
  if (order.worker) {
    const worker = await findById(db.users, order.worker);
    result.worker = populateUser(worker, options.workerFields || 'name phone skills avatar');
  }
  if (order.assignedBy) {
    const assigner = await findById(db.users, order.assignedBy);
    result.assignedBy = populateUser(assigner, 'name');
  }
  if (result.timeline) {
    result.timeline = result.timeline.map(t => ({
      ...t,
      createdAt: new Date(t.createdAt)
    }));
  }
  return result;
};

const populateOrderList = async (orders, options = {}) => {
  const userIds = new Set();
  orders.forEach(o => {
    if (o.owner) userIds.add(o.owner);
    if (o.worker) userIds.add(o.worker);
    if (o.assignedBy) userIds.add(o.assignedBy);
  });

  const users = {};
  for (const id of userIds) {
    const u = await findById(db.users, id);
    if (u) users[id] = u;
  }

  return orders.map(order => {
    const result = { ...order, id: order._id };
    if (order.owner && users[order.owner]) {
      result.owner = populateUser(users[order.owner], options.ownerFields || 'name phone building room avatar');
    }
    if (order.worker && users[order.worker]) {
      result.worker = populateUser(users[order.worker], options.workerFields || 'name phone skills avatar');
    }
    if (order.assignedBy && users[order.assignedBy]) {
      result.assignedBy = populateUser(users[order.assignedBy], 'name');
    }
    if (result.timeline) {
      result.timeline = result.timeline.map(t => ({
        ...t,
        createdAt: new Date(t.createdAt)
      }));
    }
    return result;
  });
};

module.exports = {
  User: UserModel,
  RepairOrder: RepairOrderModel,
  aggregateOrders,
  populateOrder,
  populateOrderList,
  toObjectId
};
