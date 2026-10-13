import mongoose from 'mongoose';
import fs from 'fs';
import dotenv from 'dotenv';
import Product from './models/Product.js';

dotenv.config();

const categoryMap = {
  'processeurs': 'CPU',
  'cartes-graphiques': 'GPU',
  'cartes-meres': 'Motherboard',
  'memoire-ram': 'RAM',
  'ssd': 'SSD',
  'disques-durs': 'HDD',
  'alimentations': 'PSU',
  'boitiers': 'Case',
  'ventirads': 'CPU Cooler',
  'watercooling': 'Water Cooling',
  'pates-thermiques': 'Thermal Paste',
  'souris': 'Mouse',
  'claviers': 'Keyboard',
  'casques': 'Headset',
  'ecrans': 'Monitor',
  'enceintes': 'Speakers',
  'webcams': 'Webcam',
  'microphones': 'Microphone',
  'tapis-de-souris': 'Mouse Pad',
  'manettes': 'Gamepad',
  'imprimantes': 'Printer',
  'chaises-gaming': 'Gaming Chair',
  'bureaux': 'Desk',
  'routeurs': 'Router',
  'adaptateurs-wifi': 'WiFi Adapter',
  'cartes-reseau': 'Network Card',
  'cables-reseau': 'Network Cable',
  'cables-adaptateurs': 'Cable/Adapter',
  'pc-gamer-fixe': 'Gaming PC',
  'portables-gaming': 'Gaming Laptop',
  'portables-bureautique': 'Office Laptop',
  'pc-bureau': 'Office PC',
  'sacs': 'Bag',
  'tables-gaming': 'Gaming Desk',
  'ventilateurs': 'Case Fan',
  'switches': 'Network Switch'
};

const transformProduct = (raw) => {
  return {
    slug: raw.id,
    name: raw.name,
    description: {
      ar: raw.description?.ar || '',
      fr: raw.description?.fr || '',
      en: raw.description?.en || '',
    },
    brand: raw.brand,
    category: categoryMap[raw.category] || raw.category,
    price: raw.price,
    salePrice: raw.salePrice || null,
    stock: raw.stock || 0,
    specs: raw.specs || {},
    images: Array.isArray(raw.images) ? raw.images : [],
    warrantyMonths: raw.warrantyMonths || 12,
    isActive: raw.status === 'active',
  };
};

const seedProducts = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    console.log('Reading products.json...');
    const rawData = fs.readFileSync('./data/products.json', 'utf-8');
    const products = JSON.parse(rawData);
    console.log('Found ' + products.length + ' products');

    console.log('Deleting old products...');
    const deleted = await Product.deleteMany({});
    console.log('Deleted ' + deleted.deletedCount + ' old products');

    console.log('Transforming products...');
    const transformed = products.map(transformProduct);

    console.log('Inserting products...');
    const inserted = await Product.insertMany(transformed);
    console.log('Inserted ' + inserted.length + ' products');

    console.log('');
    console.log('Final Report:');
    console.log('   Total products: ' + inserted.length);

    const byCategory = {};
    transformed.forEach(p => {
      byCategory[p.category] = (byCategory[p.category] || 0) + 1;
    });
    console.log('');
    console.log('   By Category:');
    Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, count]) => {
        console.log('   - ' + cat + ': ' + count);
      });

    console.log('');
    console.log('Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error: ' + error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

seedProducts();