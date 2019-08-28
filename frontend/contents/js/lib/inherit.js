/**
 * inherit
 * @param {object} Parent
 * @param {object} Child
 *
 */
const inherit = (function(Parent, Child) {
  const F = function() {};
  return function(Parent, Child) {
    F.prototype = Parent.prototype;
    Child.prototype = new F();
    Child.prototype.constructor = Child;
    Child.super = Parent.prototype;
  };
})();
