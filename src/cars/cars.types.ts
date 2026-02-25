export interface CarImageView {
  id: string;
  url: string;
  position: number;
}

export interface CarSpecView {
  engine: string;
  transmission: string;
  fuelType: string;
}

export interface CarView {
  id: string;
  name: string;
  category: string;
  modelYear: number;
  basePrice: number;
  variant: string;
  description: string;
  availability: 'AVAILABLE' | 'NOT_AVAILABLE' | 'COMING_SOON';
  isFeatured: boolean;
  specs: CarSpecView;
  images: CarImageView[];
  createdAt: string;
  updatedAt: string;
}
