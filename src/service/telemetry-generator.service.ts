import {Injectable} from '@angular/core';
import {Map} from '@app/app';
import {
  CorrelationData,
  Environment,
  ImpressionType,
  InteractSubtype,
  InteractType,
  Mode,
  PageId,
  Rollup,
  TelemetryObject,
  TelemetryService
} from 'sunbird-sdk';

@Injectable()
export class TelemetryGeneratorService {
  constructor(private telemetryService: TelemetryService) {
  }

  generateInteractTelemetry(interactType, subType, env, pageId, object?: TelemetryObject, values?: Map,
                            rollup?: Rollup, corRelationList?: Array<CorrelationData>) {
    this.telemetryService.interact(interactType, subType, env, pageId, object, values,
      rollup, corRelationList);
  }

  generateImpressionTelemetry(type, subtype, pageId, env, objectId?: string, objectType?: string,
                              objectVersion?: string, rollup?: Rollup, corRelationList?: Array<CorrelationData>) {
    this.telemetryService.impression(type, subtype, pageId, env, objectId, objectType,
      objectVersion, rollup, corRelationList);
  }

  generateEndTelemetry(type, mode, pageId, env, object?: TelemetryObject, rollup?: Rollup, corRelationList?: Array<CorrelationData>) {
    this.telemetryService.end(type, mode, pageId, env, object, rollup, corRelationList);
  }

  generateStartTelemetry(pageId, object?: TelemetryObject, rollup?: Rollup, corRelationList?: Array<CorrelationData>) {
    this.telemetryService.start(pageId, Environment.HOME, Mode.PLAY, object, rollup, corRelationList);
  }

  generateLogEvent(logLevel, message, env, type, params: Array<any>) {
    this.telemetryService.log(logLevel, message, env, type, params);
  }

  generateErrorTelemetry(env, errCode, errorType, pageId, stackTrace) {
    this.telemetryService.error(env, errCode, errorType, pageId, stackTrace);
  }

  generateBackClickedTelemetry(pageId, env, isNavBack: boolean, identifier?: string, corRelationList?) {
    const values = new Map();
    if (identifier) {
      values['identifier'] = identifier;
    }
    this.generateInteractTelemetry(
      InteractType.TOUCH,
      isNavBack ? InteractSubtype.NAV_BACK_CLICKED : InteractSubtype.DEVICE_BACK_CLICKED,
      env,
      pageId,
      undefined,
      values,
      corRelationList);

  }

  generatePageViewTelemetry(pageId, env, subType?) {
    this.generateImpressionTelemetry(ImpressionType.VIEW, subType ? subType : '',
      pageId,
      env);
  }

  generateSpineLoadingTelemetry(content: any, isFirstTime) {
    const values = new Map();
    values['isFirstTime'] = isFirstTime;
    values['size'] = content.size;
    const telemetryObject: TelemetryObject = new TelemetryObject();
    telemetryObject.id = content.identifier || content.contentId;
    telemetryObject.type = content.contentType;
    telemetryObject.version = content.pkgVersion;
    this.generateInteractTelemetry(
      InteractType.OTHER,
      InteractSubtype.LOADING_SPINE,
      Environment.HOME,
      PageId.DOWNLOAD_SPINE,
      telemetryObject,
      values);
  }

  generateCancelDownloadTelemetry(content: any) {
    const values = new Map();
    const telemetryObject: TelemetryObject = new TelemetryObject();
    telemetryObject.id = content.identifier || content.contentId;
    telemetryObject.type = content.contentType;
    telemetryObject.version = content.pkgVersion;
    this.generateInteractTelemetry(
      InteractType.TOUCH,
      InteractSubtype.CANCEL_CLICKED,
      Environment.HOME,
      PageId.DOWNLOAD_SPINE,
      telemetryObject,
      values);
  }

  generateDownloadAllClickTelemetry(pageId, content, downloadingIdentifier, childrenCount) {
    const values = new Map();
    values['downloadingIdentifers'] = downloadingIdentifier;
    values['childrenCount'] = childrenCount;
    const telemetryObject: TelemetryObject = new TelemetryObject();
    telemetryObject.id = content.identifier || content.contentId;
    telemetryObject.type = content.contentType;
    telemetryObject.version = content.pkgVersion;
    this.generateInteractTelemetry(
      InteractType.TOUCH,
      InteractSubtype.DOWNLOAD_ALL_CLICKED,
      Environment.HOME,
      pageId,
      telemetryObject,
      values);
  }

  generatePullToRefreshTelemetry(pageId, env) {
    this.generateInteractTelemetry(
      InteractType.TOUCH,
      InteractSubtype.PULL_TO_REFRESH,
      env,
      pageId
    );
  }

  readLessOrReadMore(param, objRollup, corRelationList, telemetryObject) {
    this.generateInteractTelemetry(InteractType.TOUCH,
      param === 'READ_MORE' ? InteractSubtype.READ_MORE_CLICKED : InteractSubtype.READ_LESS_CLICKED,
      Environment.HOME,
      PageId.COLLECTION_DETAIL,
      undefined,
      telemetryObject,
      objRollup,
      corRelationList);
  }

  generateProfilePopulatedTelemetry(pageId, frameworkId, mode) {
    const values = new Map();
    values['frameworkId'] = frameworkId;
    values['mode'] = mode;
    this.generateInteractTelemetry(
      InteractType.OTHER,
      InteractSubtype.PROFILE_ATTRIBUTE_POPULATION,
      Environment.HOME,
      pageId,
      undefined,
      values);
  }

  generateExtraInfoTelemetry(values: Map, pageId) {
    this.generateInteractTelemetry(
      InteractType.OTHER,
      InteractSubtype.EXTRA_INFO,
      Environment.HOME,
      pageId,
      undefined,
      values);
  }

  generateContentCancelClickedTelemetry(content: any, downloadProgress) {
    const values = new Map();
    values['size'] = this.transform(content.size);
    if (content.size && downloadProgress) {
      const kbsofar = (content.size / 100) * Number(downloadProgress);
      values['downloadedSoFar'] = this.transform(kbsofar);
    }
    const telemetryObject: TelemetryObject = new TelemetryObject();
    telemetryObject.id = content.identifier || content.contentId;
    telemetryObject.type = content.contentType;
    telemetryObject.version = content.pkgVersion;
    this.generateInteractTelemetry(
      InteractType.TOUCH,
      InteractSubtype.CANCEL_CLICKED,
      Environment.HOME,
      PageId.CONTENT_DETAIL,
      telemetryObject,
      values);
  }

  transform(size: any, roundOf: number = 2) {
    if (size || size === 0) {
      if (isNaN(size)) {
        size = 0;
      }
      size /= 1024;
      if (size < 1024) {
        return size.toFixed(roundOf) + ' KB';
      }
      size /= 1024;
      if (size < 1024) {
        return size.toFixed(roundOf) + ' MB';
      }
      size /= 1024;
      if (size < 1024) {
        return size.toFixed(roundOf) + ' GB';
      }
      size /= 1024;
      return size.toFixed(roundOf) + ' TB';
    } else {
      return '0 KB';
    }
  }

}
