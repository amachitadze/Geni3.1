export enum Gender {
  Male = 'male',
  Female = 'female',
}

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  spouseId?: string;
  exSpouseIds?: string[]; // To store previous spouses
  children: string[];
  parentIds: string[]; // Added to track parents
  birthDate?: string;
  deathDate?: string;
  imageUrl?: string;
  contactInfo?: {
    phone?: string;
    email?: string;
    address?: string;
  };
  bio?: string;
  cemeteryAddress?: string;
}

export type People = Record<string, Person>;

export type Relationship = 'spouse' | 'child' | 'parent' | 'sibling';

export type ModalAction = 'add' | 'edit';

export interface ModalContext {
  action: ModalAction;
  personId: string;
}

export interface ModalState {
  isOpen: boolean;
  context: ModalContext | null;
}