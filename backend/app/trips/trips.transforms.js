'use strict';

var transformsUtils = require('../utils/transforms');

var tripsTransforms = {
  fromCollection: tripsTransformsFromCollection,
  toCollection: tripsTransformsToCollection,
};

module.exports = tripsTransforms;

function tripsTransformsFromCollection(src) {
  var dest = {
    _id: src._id,
    contents: src.contents,
    created_date: src.created.seal_date,
    modified_date: src.modified.seal_date,
  };

  if(src.ended) {
    dest.ended_date = src.ended.seal_date;
  }

  return transformsUtils.fromCollection(dest);
}

function tripsTransformsToCollection(src) {
  var dest = {
    contents: src.contents,
  };

  return transformsUtils.toCollection(dest);
}
