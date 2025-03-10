/**
 *
 * @param {object} param
 * @param {object=} param.data
 * @param {number=} param.totalCount
 * @param {number=} param.resultCode
 * @param {string=} param.resultMessage
 */
exports.makeResponse = ({ data, totalCount, resultCode, resultMessage }) => {
  return {
    data,
    totalCount,
    resultCode: resultCode || 0,
    resultMessage: resultMessage || "",
  };
};
