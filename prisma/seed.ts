import { db } from '../src/lib/db';
import { hash } from 'crypto';

async function main() {
  console.log('🌱 Seeding database...');

  // Create Settings
  await db.setting.createMany({
    data: [
      { key: 'school_name', value: 'Mitooma Institute of Business and Management' },
      { key: 'school_short_name', value: 'MIBAM' },
      { key: 'school_location', value: 'Mitooma, Western Uganda' },
      { key: 'school_phone', value: '+256 772 123 456' },
      { key: 'school_email', value: 'info@mibam.ac.ug' },
      { key: 'school_motto', value: 'Education for Empowerment' },
      { key: 'currency', value: 'UGX' },
      { key: 'receipt_prefix', value: 'RCT' },
      { key: 'student_id_prefix', value: 'MIBAM' },
    ],

  });

  // Create Users
  const admin = await db.user.create({
    data: {
      email: 'admin@mibam.ac.ug',
      name: 'Admin User',
      password: 'admin123', // In production, this would be hashed
      role: 'super_admin',
      active: true,
    },
  });

  const principal = await db.user.create({
    data: {
      email: 'principal@mibam.ac.ug',
      name: 'Dr. Jane Mukasa',
      password: 'principal123',
      role: 'principal',
      active: true,
    },
  });

  const accountant = await db.user.create({
    data: {
      email: 'accountant@mibam.ac.ug',
      name: 'Robert Tumwine',
      password: 'accountant123',
      role: 'accountant',
      active: true,
    },
  });

  const bursar = await db.user.create({
    data: {
      email: 'bursar@mibam.ac.ug',
      name: 'Grace Ainembabazi',
      password: 'bursar123',
      role: 'bursar',
      active: true,
    },
  });

  // Create Academic Year
  const academicYear = await db.academicYear.create({
    data: {
      name: '2024/2025',
      startDate: new Date('2024-08-01'),
      endDate: new Date('2025-07-31'),
      active: true,
    },
  });

  // Create Semesters
  const semester1 = await db.semester.create({
    data: {
      name: 'Semester 1',
      academicYearId: academicYear.id,
      startDate: new Date('2024-08-01'),
      endDate: new Date('2024-12-15'),
      active: true,
    },
  });

  const semester2 = await db.semester.create({
    data: {
      name: 'Semester 2',
      academicYearId: academicYear.id,
      startDate: new Date('2025-01-15'),
      endDate: new Date('2025-05-30'),
      active: false,
    },
  });

  // Create Courses
  const courses = await Promise.all([
    db.course.create({
      data: {
        name: 'Business Administration (Diploma)',
        code: 'BBA',
        programType: 'diploma',
        duration: 4,
        tuitionFee: 1200000,
      },
    }),
    db.course.create({
      data: {
        name: 'Accounting and Finance',
        code: 'ACC',
        programType: 'diploma',
        duration: 4,
        tuitionFee: 1100000,
      },
    }),
    db.course.create({
      data: {
        name: 'Computer Science',
        code: 'CSC',
        programType: 'diploma',
        duration: 4,
        tuitionFee: 1300000,
      },
    }),
    db.course.create({
      data: {
        name: 'Secretarial Studies',
        code: 'SEC',
        programType: 'certificate',
        duration: 2,
        tuitionFee: 800000,
      },
    }),
    db.course.create({
      data: {
        name: 'Marketing',
        code: 'MKT',
        programType: 'diploma',
        duration: 4,
        tuitionFee: 1100000,
      },
    }),
    db.course.create({
      data: {
        name: 'Public Administration',
        code: 'PAD',
        programType: 'diploma',
        duration: 4,
        tuitionFee: 1000000,
      },
    }),
    db.course.create({
      data: {
        name: 'Business Administration (Certificate)',
        code: 'BBA-C',
        programType: 'certificate',
        duration: 2,
        tuitionFee: 750000,
      },
    }),
    db.course.create({
      data: {
        name: 'Information Technology',
        code: 'IT',
        programType: 'certificate',
        duration: 2,
        tuitionFee: 900000,
      },
    }),
  ]);

  // Create Students
  const firstNames = ['Emmanuel', 'Sarah', 'Joshua', 'Patience', 'David', 'Ruth', 'Samuel', 'Doreen', 'Peter', 'Agnes', 'James', 'Blessing', 'John', 'Faith', 'Michael', 'Hope', 'Andrew', 'Grace', 'Thomas', 'Peace', 'Steven', 'Vivian', 'Paul', 'Esther', 'Dan', 'Prossy', 'Ivan', 'Annet', 'Brian', 'Monica', 'Kenneth', 'Catherine', 'Richard', 'Jackie', 'Martin', 'Diana', 'Robert', 'Juliet', 'Frank', 'Brenda'];
  const lastNames = ['Tumusiime', 'Ainembabazi', 'Mugisha', 'Nabimanya', 'Turyakira', 'Aheisibwe', 'Mwesigye', 'Ariho', 'Rukundo', 'Natukunda', 'Baguma', 'Kyomuhangi', 'Oweeka', 'Busingye', 'Byamugisha', 'Tumwebaze', 'Niwebaze', 'Abaho', 'Akampurira', 'Baryaruha', 'Kagurusi', 'Muhwezi', 'Rwakatale', 'Kakuru', 'Mbabazi', 'Tushabomwe', 'Atuheire', 'Basheija', 'Katemba', 'Ninsiima', 'Rukirabashaija', 'Tindyebwa', 'Kyamagero', 'Ahimbisibwe', 'Ntaganzwa', 'Tumuhimbise', 'Byaruhanga', 'Rutahindurwa', 'Bwanika', 'Muhumuza'];

  const students = [];
  const intakes = ['August 2024', 'January 2025'];
  const genders = ['male', 'female'];
  
  for (let i = 0; i < 40; i++) {
    const course = courses[i % courses.length];
    const gender = genders[i % 2];
    const intake = intakes[i % 2];
    const firstName = firstNames[i];
    const lastName = lastNames[i];
    const studentId = `MIBAM/2024/${String(i + 1).padStart(3, '0')}`;

    const student = await db.student.create({
      data: {
        studentId,
        firstName,
        lastName,
        gender,
        dateOfBirth: new Date(2000 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        courseId: course.id,
        programType: course.programType,
        intake,
        academicYearId: academicYear.id,
        semesterId: semester1.id,
        phoneNumber: `+256 7${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)} ${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@student.mibam.ac.ug`,
        guardianName: `Mr. ${lastNames[(i + 5) % lastNames.length]}`,
        guardianContact: `+256 7${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)} ${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`,
        address: `Mitooma, Western Uganda`,
        status: 'active',
      },
    });
    students.push(student);
  }

  // Create Payments
  const paymentMethods = ['cash', 'bank', 'mobile_money'];
  let receiptCounter = 1;

  for (let i = 0; i < 60; i++) {
    const student = students[i % students.length];
    const course = courses.find(c => c.id === student.courseId);
    const totalFee = course?.tuitionFee || 1000000;
    
    // Some students have paid in full, some partially
    const paidAmounts = [totalFee, totalFee * 0.75, totalFee * 0.5, totalFee * 0.6, totalFee * 0.8, totalFee * 0.3];
    const amount = paidAmounts[i % paidAmounts.length];
    
    const daysAgo = Math.floor(Math.random() * 90);
    const paymentDate = new Date();
    paymentDate.setDate(paymentDate.getDate() - daysAgo);

    await db.payment.create({
      data: {
        receiptNumber: `RCT-2024-${String(receiptCounter++).padStart(4, '0')}`,
        studentId: student.id,
        amount,
        paymentMethod: paymentMethods[i % 3],
        reference: i % 3 === 1 ? `BANK-${String(Math.floor(Math.random() * 100000)).padStart(6, '0')}` : i % 3 === 2 ? `MM-${String(Math.floor(Math.random() * 1000000)).padStart(8, '0')}` : null,
        semester: 'Semester 1',
        academicYear: '2024/2025',
        notes: i % 5 === 0 ? `Payment for ${student.firstName} ${student.lastName}` : null,
        receivedBy: admin.id,
        receivedAt: paymentDate,
      },
    });
  }

  // Create Expenses
  const expenseCategories = ['salaries', 'utilities', 'maintenance', 'stationery', 'fuel', 'internet', 'marketing', 'rent', 'miscellaneous'];
  const expenseTitles: Record<string, string[]> = {
    salaries: ['Staff Salary - December', 'Staff Salary - November', 'Staff Salary - January', 'Teaching Assistant Stipend', 'Support Staff Payment'],
    utilities: ['Electricity Bill - December', 'Water Bill - November', 'Electricity Bill - January', 'Water Bill - December'],
    maintenance: ['Classroom Renovation', 'Computer Lab Repair', 'Plumbing Repair', 'Painting - Admin Block'],
    stationery: ['Office Supplies', 'Examination Papers', 'Printer Cartridges', 'Student Files'],
    fuel: ['Generator Fuel', 'Vehicle Fuel - Field Trip', 'Generator Fuel - January'],
    internet: ['Monthly Internet Subscription', 'WiFi Upgrade', 'Router Replacement'],
    marketing: ['Open Day Advertisement', 'Brochure Printing', 'Social Media Ads'],
    rent: ['Monthly Rent - Annex Building', 'Monthly Rent - January'],
    miscellaneous: ['Staff Welfare', 'Emergency Fund', 'Student Event Support', 'Cleaning Supplies'],
  };

  const expenseAmounts: Record<string, number[]> = {
    salaries: [3500000, 2800000, 3200000, 500000, 750000],
    utilities: [450000, 180000, 520000, 190000],
    maintenance: [1200000, 800000, 350000, 600000],
    stationery: [250000, 150000, 120000, 80000],
    fuel: [300000, 250000, 280000],
    internet: [200000, 500000, 150000],
    marketing: [350000, 200000, 150000],
    rent: [1500000, 1500000],
    miscellaneous: [100000, 200000, 150000, 75000],
  };

  for (let i = 0; i < 25; i++) {
    const category = expenseCategories[i % expenseCategories.length];
    const titles = expenseTitles[category];
    const amounts = expenseAmounts[category];
    const titleIndex = i % titles.length;
    
    const daysAgo = Math.floor(Math.random() * 90);
    const expenseDate = new Date();
    expenseDate.setDate(expenseDate.getDate() - daysAgo);

    const isApproved = Math.random() > 0.3;

    await db.expense.create({
      data: {
        title: titles[titleIndex],
        amount: amounts[titleIndex],
        category,
        paymentMethod: paymentMethods[i % 3],
        description: `${category.charAt(0).toUpperCase() + category.slice(1)} expense for MIBAM`,
        date: expenseDate,
        approvedBy: isApproved ? principal.id : null,
        status: isApproved ? 'approved' : 'pending',
        createdBy: accountant.id,
      },
    });
  }

  // Create Audit Logs
  const actions = [
    { action: 'LOGIN', entity: 'auth', details: 'Admin user logged in' },
    { action: 'CREATE_STUDENT', entity: 'student', details: 'Created new student record' },
    { action: 'RECORD_PAYMENT', entity: 'payment', details: 'Recorded fee payment' },
    { action: 'CREATE_EXPENSE', entity: 'expense', details: 'Created new expense record' },
    { action: 'APPROVE_EXPENSE', entity: 'expense', details: 'Approved expense request' },
    { action: 'UPDATE_SETTINGS', entity: 'setting', details: 'Updated school settings' },
  ];

  for (let i = 0; i < 15; i++) {
    const act = actions[i % actions.length];
    const daysAgo = Math.floor(Math.random() * 30);
    const logDate = new Date();
    logDate.setDate(logDate.getDate() - daysAgo);

    await db.auditLog.create({
      data: {
        userId: [admin.id, principal.id, accountant.id][i % 3],
        action: act.action,
        entity: act.entity,
        details: act.details,
        createdAt: logDate,
      },
    });
  }

  console.log('✅ Database seeded successfully!');
  console.log(`- ${await db.user.count()} users`);
  console.log(`- ${await db.student.count()} students`);
  console.log(`- ${await db.course.count()} courses`);
  console.log(`- ${await db.payment.count()} payments`);
  console.log(`- ${await db.expense.count()} expenses`);
  console.log(`- ${await db.auditLog.count()} audit logs`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
