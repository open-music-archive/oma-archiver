import { Injectable } from '@angular/core';
import { Record } from '../types';

@Injectable()
export class ApiService {

  private API_URL = "http://localhost:8060/";//"https://play-it-again.herokuapp.com/";

  postRecord(record: Record) {
    this.postJsonToApi('record', record);
  }

  private async postJsonToApi(path: string, json: {}, params?: {}) {
    path = this.addParams(path, params);
    const response = await fetch(this.API_URL+path, {
      method: 'post',
      body: JSON.stringify(json),
      headers: { 'Content-Type': 'application/json' }
    });
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  /*private getJsonFromApi(path: string, params?: {}): Promise<any> {
    path = this.addParams(path, params);
    return fetch(this.API_URL+path)
      .then(r => r.text())
      .then(t => JSON.parse(t))
      .catch(e => console.log(e));
  }*/

  private addParams(path, params?: {}) {
    if (params) {
      let paramStrings = Array.from(Object.keys(params))
        .map(k => k+"="+encodeURIComponent(params[k]));
      path += '?'+paramStrings.join('&');
    }
    return path;
  }

}