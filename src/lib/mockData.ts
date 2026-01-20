import { Student, Teacher, Parent, Class, GalleryImage, Schedule } from './types';

export const mockTeachers: Teacher[] = [
  {
    id: 't1',
    email: 'marie.dupont@pueriangeli.cd',
    firstName: 'Marie',
    lastName: 'Dupont',
    role: 'teacher',
    classId: 'c1',
    phone: '+243 999 123 456',
    createdAt: new Date('2023-01-15'),
  },
  {
    id: 't2',
    email: 'jean.kabongo@pueriangeli.cd',
    firstName: 'Jean',
    lastName: 'Kabongo',
    role: 'teacher',
    classId: 'c4',
    phone: '+243 999 234 567',
    createdAt: new Date('2023-02-20'),
  },
];

export const mockParents: Parent[] = [
  {
    id: 'p1',
    email: 'parent.mutombo@email.com',
    firstName: 'Joseph',
    lastName: 'Mutombo',
    role: 'parent',
    childrenIds: ['s1', 's2'],
    phone: '+243 999 345 678',
    address: 'Avenue Lumumba, 123',
    createdAt: new Date('2023-03-10'),
  },
  {
    id: 'p2',
    email: 'parent.mbuyi@email.com',
    firstName: 'Grace',
    lastName: 'Mbuyi',
    role: 'parent',
    childrenIds: ['s1'],
    phone: '+243 999 456 789',
    address: 'Boulevard du 30 Juin, 456',
    createdAt: new Date('2023-03-15'),
  },
];

export const mockStudents: Student[] = [
  {
    id: 's1',
    firstName: 'Emmanuel',
    lastName: 'Mutombo',
    postName: 'Kalala',
    classId: 'c1',
    parentIds: ['p1', 'p2'],
    dateOfBirth: new Date('2019-05-15'),
    createdAt: new Date('2023-09-01'),
  },
  {
    id: 's2',
    firstName: 'Sarah',
    lastName: 'Mutombo',
    postName: 'Kabwe',
    classId: 'c4',
    parentIds: ['p1'],
    dateOfBirth: new Date('2016-08-22'),
    createdAt: new Date('2023-09-01'),
  },
  {
    id: 's3',
    firstName: 'David',
    lastName: 'Ilunga',
    postName: 'Mwamba',
    classId: 'c1',
    parentIds: [],
    dateOfBirth: new Date('2019-03-10'),
    createdAt: new Date('2023-09-01'),
  },
];

const createSchedule = (classId: string): Schedule[] => [
  { id: `${classId}-1`, day: 'Lundi', startTime: '08:00', endTime: '09:30', subject: 'Mathématiques' },
  { id: `${classId}-2`, day: 'Lundi', startTime: '10:00', endTime: '11:30', subject: 'Français' },
  { id: `${classId}-3`, day: 'Mardi', startTime: '08:00', endTime: '09:30', subject: 'Sciences' },
  { id: `${classId}-4`, day: 'Mardi', startTime: '10:00', endTime: '11:30', subject: 'Histoire-Géo' },
  { id: `${classId}-5`, day: 'Mercredi', startTime: '08:00', endTime: '09:30', subject: 'Arts' },
  { id: `${classId}-6`, day: 'Jeudi', startTime: '08:00', endTime: '09:30', subject: 'Éducation Physique' },
  { id: `${classId}-7`, day: 'Jeudi', startTime: '10:00', endTime: '11:30', subject: 'Musique' },
  { id: `${classId}-8`, day: 'Vendredi', startTime: '08:00', endTime: '09:30', subject: 'Mathématiques' },
  { id: `${classId}-9`, day: 'Vendredi', startTime: '10:00', endTime: '11:30', subject: 'Français' },
];

export const mockClasses: Class[] = [
  { id: 'c1', name: '1ère Maternelle A', teacherId: 't1', studentIds: ['s1', 's3'], schedule: createSchedule('c1') },
  { id: 'c2', name: '2ème Maternelle A', teacherId: undefined, studentIds: [], schedule: createSchedule('c2') },
  { id: 'c3', name: '3ème Maternelle A', teacherId: undefined, studentIds: [], schedule: createSchedule('c3') },
  { id: 'c4', name: '1ère Primaire A', teacherId: 't2', studentIds: ['s2'], schedule: createSchedule('c4') },
  { id: 'c5', name: '2ème Primaire A', teacherId: undefined, studentIds: [], schedule: createSchedule('c5') },
  { id: 'c6', name: '3ème Primaire A', teacherId: undefined, studentIds: [], schedule: createSchedule('c6') },
  { id: 'c7', name: '4ème Primaire A', teacherId: undefined, studentIds: [], schedule: createSchedule('c7') },
  { id: 'c8', name: '5ème Primaire A', teacherId: undefined, studentIds: [], schedule: createSchedule('c8') },
  { id: 'c9', name: '6ème Primaire A', teacherId: undefined, studentIds: [], schedule: createSchedule('c9') },
];

export const mockGalleryImages: GalleryImage[] = [
  {
    id: 'g1',
    url: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800',
    title: 'Cour de récréation',
    description: 'Les élèves profitent de la pause',
    uploadedAt: new Date('2024-01-10'),
    uploadedBy: 'admin',
  },
  {
    id: 'g2',
    url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800',
    title: 'Classe de maternelle',
    description: 'Activités ludiques',
    uploadedAt: new Date('2024-01-15'),
    uploadedBy: 'admin',
  },
  {
    id: 'g3',
    url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800',
    title: 'Bibliothèque',
    description: 'Notre espace lecture',
    uploadedAt: new Date('2024-01-20'),
    uploadedBy: 'admin',
  },
  {
    id: 'g4',
    url: 'https://images.unsplash.com/photo-1564429238718-df4c03d09754?w=800',
    title: 'Fête de fin d\'année',
    description: 'Célébration avec les familles',
    uploadedAt: new Date('2024-02-01'),
    uploadedBy: 'admin',
  },
];
