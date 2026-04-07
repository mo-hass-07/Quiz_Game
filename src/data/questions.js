const questions = [
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
  }
];

module.exports = questions;