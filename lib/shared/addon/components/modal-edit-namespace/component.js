import { alias } from '@ember/object/computed';
import Component from '@ember/component';
import NewOrEdit from 'shared/mixins/new-or-edit';
import { tagChoices } from 'ui/models/namespace';
import ModalBase from 'shared/mixins/modal-base';
import { uniqKeys } from 'shared/utils/util';
import layout from './template';
import { inject as service } from '@ember/service';
import { set, get, observer } from '@ember/object';

export default Component.extend(ModalBase, NewOrEdit, {
  scope: service(),

  layout,
  classNames: ['large-modal'],
  originalModel: alias('modalService.modalOpts'),
  editing: true,
  model: null,

  allNamespaces: null,
  allProjects: null,
  tags: null,

  init() {
    this._super(...arguments);

    var orig = get(this, 'originalModel');
    var clone = orig.clone();
    delete clone.services;
    set(this, 'model', clone);
    set(this, 'tags', (get(this, 'primaryResource.tags') || []).join(','));
    set(this, 'allNamespaces', get(this, 'clusterStore').all('namespace'));
    set(this, 'allProjects', get(this, 'globalStore').all('project').filterBy('clusterId', get(this, 'scope.currentCluster.id')));
  },

  tagsDidChanged: observer('tags', function () {
    set(this, 'primaryResource.tags', get(this, 'tags').split(',') || []);
  }),

  actions: {
    addTag(tag) {
      const tags = get(this, 'primaryResource.tags') || [];
      tags.addObject(tag);
      set(this, 'tags', tags.join(','));
    },
  },

  tagChoices: function() {
    let choices = uniqKeys(tagChoices(get(this, 'allNamespaces'))).sort();
    if ( !choices.length ) {
      return null;
    }

    return choices;
  }.property('allNamespaces.@each.group'),

  doneSaving: function () {
    this.send('cancel');
  }
});
