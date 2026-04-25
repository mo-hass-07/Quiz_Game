const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcrypt");





const seedQuestions = [
  {
    id: 1,
    question: "What is the difference between a stack and a queue?",
    answer: "A stack follows LIFO (Last In, First Out). Example: pushing and popping plates. A queue follows FIFO (First In, First Out). Example: people standing in a line.",
    keywords: ["stack", "queue"],
  },
  {
    id: 2,
    question: "What is the difference between TCP and UDP?",
    answer: "TCP (Transmission Control Protocol): Reliable, connection-oriented & Ensures data arrives correctly and in order UDP (User Datagram Protocol) Faster, connectionless & No guarantee of delivery (used in streaming, gaming)",
    keywords: ["TCP", "UDP"],
  },
  {
    id: 3,
    question: "What is a process vs a thread?",
    answer: "A process is an independent program with its own memory. A thread is a smaller unit within a process that shares memory",
    keywords: ["process", "thread"],
  },
  {
    id: 4,
    question: "What is a primary key?",
    answer: "A primary key is a field (or set of fields) that uniquely identifies each record in a table.",
    keywords: ["primary key"],
  },
  {
    id: 5,
    question: "What is the time complexity of binary search?",
    answer: "Binary search has O(log n) time complexity because it repeatedly divides the search space in half.",
    keywords: ["binary search", "time complexity"],
  },
];

async function main() {
  await prisma.question.deleteMany();
  await prisma.keyword.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash("1234", 10);
  const user = await prisma.user.create({
    data: {
      email: "admin@example.com",
      password: hashedPassword,
      name: "Admin User",
    },
  });

  for (const question of seedQuestions) {
    await prisma.question.create({
      data: {
        question: question.question,
        answer: question.answer,
        userId: user.id,
        keywords: {
          connectOrCreate: question.keywords.map((kw) => ({
            where: { name: kw },
            create: { name: kw },
          })),
        },
      },
    });
  }

  console.log("Seed data inserted successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

