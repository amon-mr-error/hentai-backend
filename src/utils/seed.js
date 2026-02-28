require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Listing = require('../models/Listing');
const Task = require('../models/Task');

const seed = async () => {
  try {
    console.log('Attempting to connect with URI:', process.env.MONGODB_URI);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Promise.all([User.deleteMany(), Listing.deleteMany(), Task.deleteMany()]);
    console.log('Cleared existing data');

    // Create users
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@iitdelhi.ac.in',
      password: 'admin123',
      campus: 'IIT Delhi',
      role: 'admin',
      isVerified: true,
      walletAddress: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ',
    });

    const user1 = await User.create({
      name: 'Rahul Kumar',
      email: 'rahul@iitdelhi.ac.in',
      password: 'password123',
      campus: 'IIT Delhi',
      studentId: 'CS2021001',
      isVerified: true,
      reputation: { score: 4.9, totalRatings: 38, totalTransactions: 42 },
    });

    const user2 = await User.create({
      name: 'Priya Sharma',
      email: 'priya@iitdelhi.ac.in',
      password: 'password123',
      campus: 'IIT Delhi',
      studentId: 'EE2022045',
      isVerified: true,
      reputation: { score: 5.0, totalRatings: 58, totalTransactions: 58 },
    });

    const user3 = await User.create({
      name: 'Arjun Mehta',
      email: 'arjun@iitdelhi.ac.in',
      password: 'password123',
      campus: 'IIT Delhi',
      studentId: 'ME2020033',
      reputation: { score: 4.7, totalRatings: 27, totalTransactions: 27 },
    });

    console.log('✅ Users created');

    // Create listings
    await Listing.insertMany([
      {
        seller: user1._id,
        title: 'HP Envy 14" Laptop — i7, 16GB RAM',
        description: 'Excellent condition laptop, purchased 1 year ago. All accessories included.',
        category: 'Electronics',
        type: 'sell',
        price: 45.0,
        priceUnit: 'fixed',
        condition: 'Like New',
        campus: 'IIT Delhi',
        location: 'Hostel C',
        tags: ['laptop', 'hp', 'i7'],
        status: 'active',
      },
      {
        seller: user2._id,
        title: 'Canon 90D DSLR + 18-55mm Lens Kit',
        description: 'Professional DSLR camera, great for photography projects.',
        category: 'Electronics',
        type: 'rent',
        price: 2.5,
        priceUnit: 'per_day',
        condition: 'Good',
        campus: 'IIT Delhi',
        location: 'Main Building',
        tags: ['camera', 'dslr', 'canon'],
        status: 'active',
      },
      {
        seller: user3._id,
        title: 'DSP Lab Kit — Semester 5, unused',
        description: 'Complete DSP lab kit, never used. All components intact.',
        category: 'Lab Gear',
        type: 'sell',
        price: 8.0,
        priceUnit: 'fixed',
        condition: 'New',
        campus: 'IIT Delhi',
        location: 'Hostel A',
        tags: ['lab', 'dsp', 'electronics'],
        status: 'active',
      },
      {
        seller: user1._id,
        title: 'Campus Cycle — Hero Sprint 26"',
        description: 'Well-maintained bicycle, perfect for campus commuting.',
        category: 'Vehicles',
        type: 'rent',
        price: 0.5,
        priceUnit: 'per_hour',
        condition: 'Good',
        campus: 'IIT Delhi',
        location: 'Hostel B Cycle Stand',
        tags: ['cycle', 'bicycle', 'transport'],
        status: 'active',
      },
      {
        seller: user2._id,
        title: 'GATE 2024 Study Books Bundle (8 books)',
        description: 'Complete GATE preparation bundle, highly curated.',
        category: 'Books',
        type: 'sell',
        price: 5.0,
        priceUnit: 'fixed',
        condition: 'Good',
        campus: 'IIT Delhi',
        location: 'Library Gate',
        tags: ['gate', 'books', 'preparation'],
        status: 'active',
      },
      {
        seller: user3._id,
        title: 'Yamaha F310 Acoustic Guitar',
        description: 'Great sounding guitar for rent during events or practice.',
        category: 'Other',
        type: 'rent',
        price: 1.2,
        priceUnit: 'per_day',
        condition: 'Good',
        campus: 'IIT Delhi',
        location: 'Music Room',
        tags: ['guitar', 'music', 'yamaha'],
        status: 'active',
      },
    ]);

    console.log('✅ Listings created');

    // Create tasks
    await Task.insertMany([
      {
        poster: user1._id,
        title: 'Print 30 pages from CSE dept',
        description: 'Need someone to print assignment sheets from CSE dept printer.',
        category: 'Printout',
        reward: 0.8,
        isUrgent: true,
        pickupLocation: 'Main Building',
        dropLocation: 'Hostel C',
        campus: 'IIT Delhi',
        status: 'OPEN',
      },
      {
        poster: user2._id,
        title: 'Pick up food from Nescafe',
        description: 'Order: 2 sandwiches, 1 coffee. Will pay food cost + reward.',
        category: 'Food Pickup',
        reward: 0.5,
        isUrgent: false,
        pickupLocation: 'Nescafe Canteen',
        dropLocation: 'EE Dept Lab 3',
        campus: 'IIT Delhi',
        status: 'OPEN',
      },
      {
        poster: user3._id,
        title: 'Submit assignment to faculty room',
        description: 'Need to submit printed assignment to Prof. Sharma room 204.',
        category: 'Submission',
        reward: 0.3,
        isUrgent: false,
        pickupLocation: 'Hostel A',
        dropLocation: 'Faculty Block Room 204',
        campus: 'IIT Delhi',
        status: 'OPEN',
      },
    ]);

    console.log('✅ Tasks created');
    console.log('\n🎉 Seed complete!');
    console.log('\n📋 Test Credentials:');
    console.log('   Admin:   admin@iitdelhi.ac.in  / admin123');
    console.log('   User 1:  rahul@iitdelhi.ac.in  / password123');
    console.log('   User 2:  priya@iitdelhi.ac.in  / password123');
    console.log('   User 3:  arjun@iitdelhi.ac.in  / password123');

    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
};

seed();
