//plugin for pagination for every model

function paginationPlugin(schema) {
    schema.statics.paginate = function (query, options, callback) {
      const { limit = 0, page = 1 } = options;
      const skip = (page - 1) * limit;
      return this.find(query)
        .skip(skip)
        .limit(limit)
        .exec(callback);
    };
  }
  
  module.exports = {paginationPlugin};
  