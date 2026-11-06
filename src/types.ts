export interface SongAnalysis {
  title: string;
  description: string;
  theme: string;
  rhythm: string;
  vibe: string;
}

export interface Scene {
  sceneNumber: number;
  action: string;
  set: string;
  actors: string;
  actionDescription: string;
}

export interface Shot {
  sceneNumber: number;
  shotNumber: number;
  type: string;
  cameraMovement: string;
  lens: string;
  duration: string;
  description: string;
}

export interface ShootDay {
  day: number;
  location: string;
  estimatedTime: string;
  scenesToShoot: number[];
  castNeeded: string[];
  equipmentNeeded: string[];
}

export interface ProductionSchedule {
  prepDays: number;
  shootDays: number;
  postProdDays: number;
  locationScouting: string;
  rehearsals: string;
  otherPrep: string;
}

export interface PromoIdea {
  title: string;
  concept: string;
  script: string;
  visualStyle: string;
  viralScore: number;
  efficiencyScore: number;
  explanation: string;
}

export interface PromoStrategy {
  versionId?: string;
  versionName?: string;
  createdAt?: number;
  targetAudience: string;
  numberOfVideos: number;
  trendsAndIdeas: string;
  promoIdeas: PromoIdea[];
}

export interface VideoTreatment {
  id?: string;
  createdAt?: number;
  analysis: SongAnalysis;
  script: string;
  scenes: Scene[];
  shotList?: Shot[];
  schedule?: ShootDay[];
  production?: ProductionSchedule;
  promoStrategy?: PromoStrategy;
  promoVersions?: PromoStrategy[];
  activePromoVersionId?: string;
}

