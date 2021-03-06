import Component from '@ember/component';
import layout from './template';
import { get, set, setProperties, observer, computed } from '@ember/object';

function maybeInt(str) {
  const num = parseInt(str,10);
  if ( num+'' === str ) {
    return num;
  }

  return str;
}

export default Component.extend({
  layout,
  workload: null,
  scaleMode: null,
  editing: null,
  isUpgrade: null,

  classNames: ['accordion-wrapper'],
  _strategy: null,
  workloadConfig: null,
  batchSize: null,

  didReceiveAttrs() {
    if (!this.get('expandFn')) {
      this.set('expandFn', function(item) {
          item.toggleProperty('expanded');
      });
    }

    this.scaleModeChanged();
  },

  scaleModeChanged: observer('scaleMode', function() {
    const scaleMode = get(this, 'scaleMode');
    const config = get(this, `workload.${scaleMode}Config`);
    set(this, 'workloadConfig', config);

    let  maxSurge = get(config, 'maxSurge');
    let  maxUnavailable = get(config, 'maxUnavailable');
    let  actualStrategy = get(config, 'strategy');

    const changes = {};

    if ( scaleMode === 'deployment' ) {
      if ( !actualStrategy ) {
        actualStrategy = 'RollingUpdate';
        maxSurge = 1;
        maxUnavailable = null;
      }

      if ( actualStrategy === 'RollingUpdate' ) {
        if ( maxSurge && maxUnavailable ) {
          changes['_strategy'] = 'custom';
        } else if ( maxSurge ) {
          changes['_strategy'] = 'startFirst';
          changes['batchSize'] = maxSurge;
        } else if ( maxUnavailable ) {
          changes['_strategy'] = 'stopFirst';
          changes['batchSize'] = maxUnavailable;
        } else {
          changes['_strategy'] = 'stopFirst';
        }
      }
    }

    setProperties(this, changes);
    this.strategyChanged();
  }),

  strategyChanged: observer('_strategy','batchSize', function() {
    const scaleMode = get(this, 'scaleMode');
    const _strategy = get(this, '_strategy');
    const config    = get(this, 'workloadConfig');

    let batchSize = maybeInt(get(this, 'batchSize'));
    let maxSurge = maybeInt(get(config, 'maxSurge'));
    let maxUnavailable = maybeInt(get(config, 'maxUnavailable'));
    if ( !maxSurge && !maxUnavailable ) {
      maxSurge = 1;
      maxUnavailable = 0;
    }

    if ( scaleMode === 'deployment' ) {
      if ( _strategy === 'startFirst' ) {
        setProperties(config, {
          strategy: 'RollingUpdate',
          maxSurge: batchSize,
          maxUnavailable: 0,
        });
      } else if ( _strategy === 'stopFirst' ) {
        setProperties(config, {
          strategy: 'RollingUpdate',
          maxSurge: 0,
          maxUnavailable: batchSize,
        });
      } else if ( _strategy === 'custom' ) {
        setProperties(config, {
          strategy: 'RollingUpdate',
          maxSurge: maxSurge,
          maxUnavailable: maxUnavailable
        });
      } else if ( _strategy === 'recreate' ) {
        setProperties(config, {
          strategy: 'Recreate',
          maxSurge: null,
          maxUnavailable: null,
        });
      }
    }
  }),

  hasMinReady: computed('scaleMode', function() {
    const scaleMode = get(this, 'scaleMode');
    return ['deployment','replicaSet','replicationController','daemonSet'].includes(scaleMode);
  }),
});
