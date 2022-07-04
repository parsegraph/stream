let nextId = 0;
const id = () => {
  return ++nextId;
};

module.exports = { id };
