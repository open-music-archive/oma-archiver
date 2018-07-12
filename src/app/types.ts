export interface RecordSide {
  title: string,
  composer: string,
  artist: string,
  catNo: string,
  label: string,
  side: string,
  soundObjects: SoundObject[],
  imageUri: string,
  time: string,
  eq: string,
  noEqAudioFile: string
}

export interface SoundObject {
  time: number,
  duration: number,
  normalFeatures: number[],
  audioUri: string,
  features: FeatureSummary[],
  featureGuid: string
}

export interface FeatureSummary {
  name: string,
  mean: number | number[],
  var: number | number[]
}

export interface Clustering {
  features: string[],
  method: string,
  clusters: Cluster[]
}

export interface Cluster {
  name: string,
  signals: string[],
  centroid: string
}

export interface DbSoundObject {
  _id: string,
  duration: number,
  audioUri: string
}

export interface DbSoundObjectFeatures extends DbSoundObject {
  normalFeatures: number[],
  features: FeatureSummary[]
}