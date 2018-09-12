import { Injectable } from '@angular/core';
import { RecordSide, Clustering, DbSoundObjectFeatures } from '../types';
import * as config from './config';
import * as util from './util';
import { ProgressObserver } from '../home';

@Injectable()
export class ApiService {

  postRecord(record: RecordSide) {
    return this.postJsonToApi('record', record);
  }

  postClustering(clustering: Clustering) {
    return this.postJsonToApi('clustering', clustering);
  }

  getFeatures(): Promise<DbSoundObjectFeatures[]> {
    return this.getJsonFromApi('features');
  }

  async scpWavToAudioStore(path: string, observer: ProgressObserver): Promise<any> {
    observer.updateProgress("uploading files to audio store", 0);
    console.log('sshpass -p '+config.ftppassword+' scp -r '+path+' '+config.ftpusername+':');
    // await util.execute('sshpass -p '+config.ftppassword+' scp -r '+path+' '+config.ftpusername+':');
  }

  private async postJsonToApi(path: string, json: {}, params?: {}): Promise<string> {
    path = this.addParams(path, params);
    const response = await fetch(config.apiurl+path, {
      method: 'post',
      body: JSON.stringify(json),
      headers: { 'Content-Type': 'application/json' }
    });
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  private getJsonFromApi(path: string, params?: {}): Promise<any> {
    path = this.addParams(path, params);
    return fetch(config.apiurl+path)
      .then(r => r.text())
      .then(t => JSON.parse(t))
      .catch(e => console.log(e));
  }

  private addParams(path, params?: {}) {
    if (params) {
      let paramStrings = Array.from(Object.keys(params))
        .map(k => k+"="+encodeURIComponent(params[k]));
      path += '?'+paramStrings.join('&');
    }
    return path;
  }

}
