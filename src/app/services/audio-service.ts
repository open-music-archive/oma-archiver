import { Injectable } from '@angular/core';
import * as uuidv4 from 'uuid/v4';
import { SoundObject } from '../types';
import { ProgressObserver } from '../home';
import * as util from './util';
import * as constants from '../constants';

@Injectable()
export class AudioService {

  async resampleWavFile(infile: string, samplerate: number, bitrate: number) {
    const outfile = infile.replace('.wav',' ')+samplerate+'_'+bitrate+ '.wav';
    await util.execute('sox "'+infile+'" -G -b '+bitrate+' "'+outfile+'" rate -v -L '+samplerate+' dither');
    return outfile;
  }

  async convertWavToFlac(infile: string, del = false) {
    if (del == true){
      await util.execute('flac --delete-input-file --best "'+infile+'"');
    } else {
      await util.execute('flac --best "'+infile+'"');
    }
    return infile.replace('.wav','.flac');
  }

  splitWavFile(input: string, sideuid: string, fragments: SoundObject[], observer: ProgressObserver): Promise<string[]> {
    observer.updateProgress("splitting audio files", 0);
    return util.mapSeries(fragments, (async (f,i) => {
      const output = await this.trim(input, sideuid, f);
      observer.updateProgress("splitting audio files", (i+1)/fragments.length);
      return output;
    }));
  }

  private async trim(infile: string, sideuid: string, object: SoundObject): Promise<string> {
    const outfile = constants.SOUND_OBJECTS_FOLDER+sideuid+'/'+uuidv4()+'.wav';
    await util.execute('sox "'+infile+'" '+outfile+' trim '+object.time+' '+object.duration)
    return outfile;
  }

}