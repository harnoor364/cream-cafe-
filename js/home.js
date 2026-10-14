/* Home page: popular dishes + price/add slots filled from data/menu.json */
(function () {
  "use strict";
  var CC = window.CC;
  var POPULAR = ["veg-lasagna", "pasta-in-red-sauce", "farmhouse-pizza", "falafel-pita-bread", "corn-sandwich", "baked-veggies"];

  CC.dishCard = function (it) {
    return '<article class="card">' +
      '<div class="card-media"><img src="' + CC.esc(it.image || "images/hero.jpg") + '" alt="' + CC.esc(it.name) + '" loading="lazy" decoding="async" width="800" height="600">' +
      (it.popular ? '<span class="tag tag-rose">Popular</span>' : "") + "</div>" +
      '<div class="card-body"><h3><span class="veg-mark' + (it.veg === false ? " nonveg" : "") + '" role="img" aria-label="' + (it.veg === false ? "Non-vegetarian" : "Vegetarian") + '"></span>' + CC.esc(it.name) + "</h3>" +
      "<p>" + CC.esc(it.description) + "</p>" +
      '<div class="card-foot"><span class="price' + (CC.priceLabel(it).indexOf("XXX") > -1 ? " tbc" : "") + '">' + CC.esc(CC.priceLabel(it)) + "</span>" +
      '<div data-action-for="' + CC.esc(it.id) + '">' + CC.actionHtml(it) + "</div></div></div></article>";
  };

  document.addEventListener("DOMContentLoaded", function () {
    var grid = document.getElementById("popularGrid");
    CC.loadMenu().then(function () {
      if (grid) {
        grid.innerHTML = POPULAR.map(function (id) { return CC.menuIndex[id]; }).filter(Boolean).map(CC.dishCard).join("");
        CC.observeReveal(grid.parentNode);
      }
      document.querySelectorAll("[data-price-for]").forEach(function (el) {
        var it = CC.menuIndex[el.getAttribute("data-price-for")];
        if (it) el.textContent = CC.priceLabel(it);
      });
      CC.refreshSteppers();
    }).catch(function () {
      if (grid) grid.innerHTML = '<p class="empty-state">Our menu couldn\'t load right now. <a href="menu.html">Open the full menu</a>.</p>';
    });
  });
})();
