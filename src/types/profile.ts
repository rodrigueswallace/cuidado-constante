export interface TutorProfileForm {
  fullName: string;
  phone: string;
  createdAt: string;
}

export interface PetProfileForm {
  id: string | null;
  name: string;
  species: string;
  birthDate: string;
  color: string;
  sex: string;
  weightKg: string;
  size: string;
  microchip: string;
  breed: string;
  notes: string;
}
