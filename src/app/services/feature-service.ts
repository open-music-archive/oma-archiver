import { Injectable } from '@angular/core';
import * as fs from 'fs';
import * as bb from 'bluebird';
import * as math from 'mathjs';
import { exec } from 'child_process';
import { ProgressObserver } from '../home';
//typings don't correspond...
//global.Promise = bb;

const FEATURE_FOLDER = './features/';
const FEATURES = {beats:'vamp:qm-vamp-plugins:qm-barbeattracker:beats', onset:'vamp:qm-vamp-plugins:qm-onsetdetector:onsets', amp:'vamp:vamp-example-plugins:amplitudefollower:amplitude', chroma:'vamp:qm-vamp-plugins:qm-chromagram:chromagram', centroid:'vamp:vamp-example-plugins:spectralcentroid:logcentroid', mfcc:'vamp:qm-vamp-plugins:qm-mfcc:coefficients', melody:'vamp:mtg-melodia:melodia:melody', pitch:'vamp:vamp-aubio:aubiopitch:frequency'};
const FEATURE_SELECTION = [FEATURES.beats, FEATURES.amp, FEATURES.mfcc, FEATURES.chroma];//[FEATURES.onset, FEATURES.amp, FEATURES.pitch, FEATURES.mfcc, FEATURES.chroma];
const FEATURE_NAMES = FEATURE_SELECTION.map(f => f.slice(f.lastIndexOf(':')+1));


@Injectable()
export class FeatureService {

  async extractFeatures(path: string, observer: ProgressObserver) {
    return bb.mapSeries(FEATURE_SELECTION, (f,i,l) =>
      this.extractFeature(path, f)
        .then(() => observer.updateProgress(i/l, "extracting "+f))
    ).then(() => observer.updateProgress(1, "extracted features"));
  }

  private async extractFeature(path: string, feature: string): Promise<any> {
    var destination = FEATURE_FOLDER + path.replace('.wav', '_').slice(path.lastIndexOf('/')+1)
      + feature.replace(/:/g, '_') + '.json';
    if (!fs.existsSync(destination)) {
      await this.execute('sonic-annotator -f -d ' + feature + ' "' + path + '" -w jams --jams-force');
      await this.execute('mv "'+path.replace('.wav', '')+'.json" "'+destination+'"');
    }
  }

  private execute(command: string): Promise<any> {
    return new Promise((resolve, reject) =>
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.log(error, stderr);
          reject();
        } else {
          resolve();
        }
      })
    )
  }

  getFragmentsAndSummarizedFeatures(path: string, fragmentLength?: number): number[][] {
    var files = fs.readdirSync(FEATURE_FOLDER);
    var name = path.replace('.wav', '').slice(path.lastIndexOf('/')+1);
    //take files that match file name and active features
    files = files.filter(f => f.indexOf(name+'_') == 0);
    files = files.filter(f => FEATURE_NAMES.indexOf(f.slice(f.lastIndexOf('_')+1, f.lastIndexOf('.'))) >= 0);
    files = files.map(f => FEATURE_FOLDER+f);
    if (files.length < FEATURE_SELECTION.length) {
      //incomplete feature files, return no fragments
      return [];
    }
    var fragments, featureFiles;
    if (isNaN(fragmentLength)) {
      var segmentationFiles = files.filter(f => f.indexOf('onsets') >= 0 || f.indexOf('beats') >= 0);
      featureFiles = files.filter(f => segmentationFiles.indexOf(f) < 0);
      fragments = this.getEventsWithDuration(segmentationFiles[0]);
    } else {
      featureFiles = files.filter(f => f.indexOf('onsets') < 0 && f.indexOf('beats') < 0);
      fragments = this.createFragments(featureFiles[0], fragmentLength);
    }
    for (let i = 0; i < featureFiles.length; i++) {
      this.addSummarizedFeature(featureFiles[i], fragments);
    }
    //remove all fragments that contain undefined features
    for (let i = fragments.length-1; i >= 0; i--) {
      //console.log(fragments[i]["vector"].length);
      if (fragments[i]["vector"].filter(function(v) {return v === undefined;}).length > 0) {
        fragments.splice(i, 1);
      }
    }
    if (fragments.length > 1) {
      //standardize the vectors
      var vectors = fragments.map(function(f){return f["vector"];});
      var transposed = math.transpose(vectors);
      var means = transposed.map(function(v){return math.mean(v);});
      var stds = transposed.map(function(v){return math.std(v);});
      //transposed = transposed.map(function(v,i){return v.map(function(e){return (e-means[i])/stds[i];})});
      for (var i = fragments.length-1; i >= 0; i--) {
        fragments[i]["vector"] = fragments[i]["vector"].map(function(e,j){ if (stds[j] != 0) { return (e-means[j])/stds[j] } return e-means[j];});
      }
    }
    return fragments;
  }

  private createFragments(featurepath, fragmentLength) {
    var json = this.readJsonSync(featurepath);
    var events = [];
    var fileName = json["file_metadata"]["identifiers"]["filename"];
    var fileDuration = json["file_metadata"]["duration"];
    for (var i = 0; i < fileDuration; i+=fragmentLength) {
      var duration = i+fragmentLength>fileDuration ? fileDuration-i : fragmentLength;
      events.push(this.createEvent(fileName, i, duration));
    }
    return events;
  }

  private getEventsWithDuration(path) {
    var json = this.readJsonSync(path);
    var events = [];
    var fileName = json["file_metadata"]["identifiers"]["filename"];
    var fileDuration = json["file_metadata"]["duration"];
    var onsets = json["annotations"][0]["data"].map(function(o){return o["time"];});
    if (onsets[0] > 0) {
      events.push(this.createEvent(fileName, 0, onsets[0]));
    }
    for (var i = 0; i < onsets.length; i++) {
      var duration = i<onsets.length-1 ? onsets[i+1]-onsets[i] : fileDuration-onsets[i];
      events.push(this.createEvent(fileName, onsets[i], duration));
    }
    return events;
  }

  private createEvent(file, time, duration) {
    return {"file":file, "time":time, "duration":duration, "vector":[]};
  }

  private addSummarizedFeature(path, segments) {
    var json = this.readJsonSync(path);
    var featureName = json["annotations"][0]["annotation_metadata"]["annotator"]["output_id"];
    var data = json["annotations"][0]["data"];
    for (var i = 0; i < segments.length; i++) {
      var currentOnset = segments[i]["time"];
      var currentOffset = currentOnset+segments[i]["duration"];
      var currentData = data.filter(d => currentOnset<=d["time"] && d["time"]<currentOffset);
      if (currentData.length == 0) {
        currentData = data.find(d => currentOnset < d["time"]);
        if (currentData == null) {
          currentData = data[data.length-1];
        }
        currentData = [currentData];
      }
      var currentValues = currentData.map(d => d["value"]);
      var means = this.getMean(currentValues);
      //console.log(currentValues.length)
      var vars = this.getVariance(currentValues);
      segments[i][featureName+"_mean"] = means;
      segments[i][featureName+"_var"] = vars;
      //console.log(Array.isArray(means) ? means.length : 1)
      segments[i]["vector"] = segments[i]["vector"].concat(Array.isArray(means) ? means : [means]); //see with just means
      //console.log("v ", segments[i]["vector"].length)
      //segments[i]["vector"] = segments[i]["vector"].concat(Array.isArray(means) ? means.concat(vars) : [means, vars]);
    }
  }

  private getMean(values) {
    return this.mapValueOrArray(math.mean, values);
  }

  private getVariance(values) {
    return this.mapValueOrArray(math.var, values);
  }

  private mapValueOrArray(func, values) {
    if (values.length > 0) {
      if (Array.isArray(values[0])) {
        return math.transpose(values).map(function(v){return func.apply(this, v);});
      }
      return func.apply(this, values);
    }
  }

  private readJsonSync(path) {
    return JSON.parse(fs.readFileSync(path, 'utf8'));
  }

}