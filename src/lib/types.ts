export type UserRole = 'admin' | 'teacher' | 'parent';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatar?: string;
  createdAt: Date;
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  postName?: string;
  classId: string;
  parentIds: string[];
  dateOfBirth?: Date;
  createdAt: Date;
}

export interface Parent extends User {
  role: 'parent';
  childrenIds: string[];
  phone?: string;
  address?: string;
}

export interface Teacher extends User {
  role: 'teacher';
  classId?: string;
  subjects?: string[];
  phone?: string;
}

export interface Admin extends User {
  role: 'admin';
}

export interface Class {
  id: string;
  name: string;
  teacherId?: string;
  studentIds: string[];
  schedule: Schedule[];
}

export interface Schedule {
  id: string;
  day: 'Lundi' | 'Mardi' | 'Mercredi' | 'Jeudi' | 'Vendredi';
  startTime: string;
  endTime: string;
  subject: string;
}

export interface GalleryImage {
  id: string;
  url: string;
  title: string;
  description?: string;
  uploadedAt: Date;
  uploadedBy: string;
}

export const DEFAULT_CLASSES = [
  '1ère Maternelle A',
  '2ème Maternelle A',
  '3ème Maternelle A',
  '1ère Primaire A',
  '2ème Primaire A',
  '3ème Primaire A',
  '4ème Primaire A',
  '5ème Primaire A',
  '6ème Primaire A',
];
