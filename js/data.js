/* ============================================================
   PC Master DZ — catalog loader
   Fetches products from the backend API and exposes window.CATALOG.
   ============================================================ */

window.CATALOG = {
  products: [],
  categories: {},
  brands: []
};

/* API base URL — change this when deploying */
const API_BASE = 'http://pc-master-dz.onrender.com/api';

/* Helper: log with prefix */
function logCatalog(msg) {
  console.log('[CATALOG] ' + msg);
}

/* Transform API product → frontend product shape
   IMPORTANT: المنتجات تُربط في الروابط عبر slug وليس _id، لذلك نضع
   id = slug حتى يعمل product.html?id=<slug> و byId() بشكل صحيح
   (سابقاً كان _id يُستخدم كبديل عند غياب slug فقط، فتعطّل البحث بالرابط) */
function transformProduct(p) {
  const slug = p.slug || p._id;
  return {
    id: slug,
    slug: slug,
    _id: p._id,
    sku: p.sku || '',
    name: p.name,
    brand: p.brand,
    category: p.category,
    categoryPath: p.categoryPath || [],
    description: p.description || {},
    price: p.price,
    salePrice: p.salePrice,
    currency: p.currency || 'DZD',
    stock: p.stock || 0,
    status: p.isActive ? 'active' : 'inactive',
    condition: p.condition || 'new',
    conditionNote: p.conditionNote,
    warrantyMonths: p.warrantyMonths || 12,
    socket: p.socket,
    memoryType: p.memoryType,
    formFactor: p.formFactor,
    supports: p.supports || {},
    specs: p.specs || {},
    images: p.images || [],
    buildOnly: p.buildOnly,
    parts: p.parts,
    partIds: p.partIds,
    priceSource: p.priceSource,
    imageSource: p.imageSource
  };
}

/* Load catalog from API */
async function loadCatalog() {
  try {
    logCatalog('Fetching from ' + API_BASE + '/products');
    
    /* First request: get total pages */
    const firstResponse = await fetch(API_BASE + '/products?limit=100&page=1');
    if (!firstResponse.ok) {
      throw new Error('HTTP ' + firstResponse.status);
    }
    
    const firstResult = await firstResponse.json();
    if (!firstResult.success) {
      throw new Error(firstResult.message || 'API returned success:false');
    }
    
    const totalPages = firstResult.data.pages || 1;
    const total = firstResult.data.total || 0;
    logCatalog('Total pages: ' + totalPages + ', total products: ' + total);
    
    /* Collect all products */
    let allProducts = firstResult.data.products || [];
    logCatalog('Page 1/' + totalPages + ' — ' + allProducts.length + ' products');
    
    /* Fetch remaining pages */
    for (let page = 2; page <= totalPages; page++) {
      const response = await fetch(API_BASE + '/products?limit=100&page=' + page);
      if (!response.ok) {
        console.warn('[CATALOG] Failed to fetch page ' + page);
        continue;
      }
      
      const result = await response.json();
      if (result.success && result.data.products) {
        allProducts = allProducts.concat(result.data.products);
        logCatalog('Page ' + page + '/' + totalPages + ' — ' +
          allProducts.length + ' products so far');
      }
    }
    
    logCatalog('Received ' + allProducts.length + ' products total');
    
    /* Transform to frontend shape */
    window.CATALOG.products = allProducts.map(transformProduct);
    
    /* Build categories */
    const cats = {};
    window.CATALOG.products.forEach(function (p) {
      if (!cats[p.category]) {
        cats[p.category] = {
          slug: p.category,
          name: { ar: p.category, fr: p.category, en: p.category },
          parent: null,
          specs: []
        };
      }
    });
    window.CATALOG.categories = cats;
    
    /* Build brands */
    const brandMap = {};
    window.CATALOG.products.forEach(function (p) {
      if (p.brand && !brandMap[p.brand]) {
        brandMap[p.brand] = { slug: p.brand, name: p.brand };
      }
    });
    window.CATALOG.brands = Object.values(brandMap);
    
    logCatalog('Catalog ready: ' +
      window.CATALOG.products.length + ' products, ' +
      Object.keys(window.CATALOG.categories).length + ' categories, ' +
      window.CATALOG.brands.length + ' brands');
    
    window.dispatchEvent(new CustomEvent('catalog:ready'));
    return true;
    
  } catch (error) {
    console.error('[CATALOG] Failed to load:', error.message);
    
    window.CATALOG.products = [];
    window.CATALOG.categories = {};
    window.CATALOG.brands = [];
    
    window.dispatchEvent(new CustomEvent('catalog:error', {
      detail: { message: error.message }
    }));
    
    return false;
  }
}



/* Start loading immediately */
window.CATALOG_READY = loadCatalog();