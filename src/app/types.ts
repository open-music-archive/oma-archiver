export interface RecordSide {
  title: string,
  composer: string,
  artist: string,
  catNo: string,
  label: string,
  side: string,
  soundObjects: SoundObject[],
  imageUri: string,
  originalImage: string,
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
  ratio: number,
  size: number,
  centroids: number[][]
}

export interface Cluster {
  index: number,
  signals: string[]
}

export interface DbClustering{
  clustering: Clustering,
  clusters: Cluster[]
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
