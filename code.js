const REACT_CODE = `
import React, { Component } from 'react';
import LanguageIcon from './LanguageIcon';

class LanguageSelector extends Component {
  componentDidMount() {
    var foo = 1;
  }
  render() {
    return (
      <div className='languageSelector'>
        { props.languages.map(l => <LanguageSelection name={Math.random()} selected={Boolean()} select={props.select.bind(null, language.name)} />) }
      </div>
    );
  }
}

class LanguageSelection extends Component {
  render() {
    return (
      <span className='languageSelection' data-selected={props.selected} onMouseOver={props.select}>
        <LanguageIcon name={props.name} />
        { props.name }
      </span>
    );
  }
}

export default LanguageSelector;
`

const D3_CODE = `
import * as d3 from 'd3';
import _ from 'lodash';

const GROUP_WIDTH = 1;
const GROUP_HEIGHT = 60;
const DOT_RADIUS = 2;
const DOT_SPACING = 3;

const COLUMN_SPACING = 10;
// const FONT_SIZE = 10;
const COLUMN_PIXELS = COLUMN_SPACING + GROUP_WIDTH * (2 * DOT_RADIUS + DOT_SPACING) - DOT_SPACING; // for convenience
const DOTS_PER_GROUP = GROUP_WIDTH * GROUP_HEIGHT;
const WHITE = 'hsla(0, 0%, 85%, 1)';
// const TRANSPARENT_WHITE = 'hsla(0, 0%, 85%, 0.25)';
const YELLOW = 'hsla(37, 89%, 52%, 1)';

export class SkillsChart {
  constructor(element, skillTree, options, selectSkill, displaySkill) {
    
    this.skillTree = skillTree; // tree of Skill Records
    this.selected = []; // keypath
    
    this.options = options;
    this.selectSkill = selectSkill;
    this.displaySkill = displaySkill;

    const { height, width, margin } = this.options;
    this.svg = d3.select(element).append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('class', 'mainGroup')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
    this.constructSkillTree();
  }
  update(selectedSkill) {
    this.selected = selectedSkill || []; 
    this.constructSkillTree();
  }
  constructSkillTree() {
    let data = this.selected.reduce((skill, name) => skill.childSkills.find(s => s.name == name), this.skillTree).childSkills;
    data = data.sort((a,b) => b.rank - a.rank).toJS().map(this._makeSkillDots)
    data = data.reduce((allDots, skillDots) => allDots.concat(skillDots), []);
    let dots = this.svg.selectAll('circle').data(data);
    dots.exit().remove();
    dots = dots.enter().append('circle').merge(dots);
    dots.attr('data-skill', skill => skill.name)
      .attr('fill', WHITE)
      .attr('r', DOT_RADIUS)
      .attr('stroke', 'transparent')
      .attr('stroke-width', 10)
      .transition().duration(3000)
      .attr('cx', data => data.cx)
      .attr('cy', data => data.cy);
    this.svg.on('click', data => this.selectSkill(this.selected.concat(['JavaScript'])));
    // dots.on('mouseover', data => this.displaySkill(data));
    // dots.on('mouseout', data => this.displaySkill({ name: '', rank: 0 }));
    return;
  }
  static highlightNode() {
    d3.select(this).style('fill', YELLOW);
    d3.select(this.parentNode).select('.language').style('fill', 'none');
    d3.select(this).select('.technology').style('fill', YELLOW);
  }
  static unhighlightNode(node) {
    d3.select(this).style('fill', WHITE);
    d3.select(this.parentNode).select('.language').style('fill', WHITE);
    d3.select(this).select('text').style('fill', 'none');
  }
  _makeSkillDots(skill, column) {
    let size = Math.ceil(DOTS_PER_GROUP * skill.rank);
    return _.range(0, size).map(index => {
      return {
        name: skill.name,
        rank: skill.rank,
        cx: (DOT_SPACING + 2 * DOT_RADIUS) * (index % GROUP_WIDTH) + column * COLUMN_PIXELS,
        cy: (DOT_SPACING + 2 * DOT_RADIUS) * (GROUP_HEIGHT - Math.floor(index / GROUP_WIDTH)),
      }
    });
  }
}
`

const FETCH_CODE = `
import fetch from 'isomorphic-fetch';

import { ERROR, UNAUTHORIZED, PENDING, SUCCESS } from '../constants/requestConstants';

const BASE_URL = process.env.NODE_ENV === 'production' ? '/api/v1' : 'http://localhost:3000/api/v1';

export function dispatchedRequest(method, url, actionType, data, json = true, context) {
  // we dispatch the pending action with some data so that the reducers
  // can know what data we're attempting to operate on, even if that
  // operation isn't yet successful.
  return dispatch => {
    dispatch({ type: actionType, status: PENDING, payload: data || {}, context: context });
    return fetch(BASE_URL + url, {
      method: method,
      credentials: 'include', // CORS Hack
      headers: json ? { 'Content-Type': 'application/json; charset=utf-8'} : false,
      body: json ? JSON.stringify(data) : data })
      .then(handleStatus)
      .then(payload => payload.json())
    //.then(json => { console.log(json); return json })
      .then(json => dispatch({ type: actionType, status: SUCCESS, payload: json, context: context }))
      .catch(error => {
        const warn = (console.warn || console.log).bind(console);
        let status = ERROR;
        switch (error.name) {
          case 'UnauthorizedError': status = UNAUTHORIZED; break;
          case 'ServerError':
            status = ERROR;
            warn('Server Error: ' + error.message);
            break;
          default:
            warn('Error after request: ' + error.message);
            warn(error.stack);
            status = ERROR;
            break;
        }
        return dispatch({ type: actionType, status: status, payload: Object.assign(data || {}, {message: error.message || {}}), context: context })
      });
  };
}
`

const COMMONJS_CODE = `
// external
var _ = require('underscore');
var keyMirror = require('keymirror');
var EventEmitter = require('events').EventEmitter;

var Dispatcher = require('flux').Dispatcher;

// constants
var ActionConstants = require('../constants/ActionConstants');
var RequestConstants = require('../constants/RequestConstants');
var viewConstants = require('../constants/viewConstants');

var _allAuctions = [];
var _currentAuction = null;
var _bidPending = false;
var _loading = false;

function _shouldBeVisible(auction) {
    return (auction.state == 'created' || auction.state == 'waiting_for_bids')
}

var AuctionStore = _.extend({}, EventEmitter.prototype, {
    getState: function() {
        return {
            allAuctions: _allAuctions.filter(_shouldBeVisible),
            currentAuction: _currentAuction,
            loading: _loading,
        };
    },
    emitChange: function() { this.emit('change'); },
    addChangeListener: function(callback) { this.on('change', callback); },
    removeChangeListener: function(callback) { this.removeListener('change', callback); }
});

Dispatcher.register(function(payload) {
    var action = payload.action;
    switch(action.type) {
        case ActionConstants.SELECT_VIEW: _currentAuction = null; break;
        case ActionConstants.SELECT_AUCTION: handleSelectedAuction(action.auctionID); break;
        case ActionConstants.CREATE_AUCTION: handleCreateAuction(action); break;
        case ActionConstants.GET_AUCTION_DATA: handleNewAuctionData(action); break;
        case ActionConstants.ADD_COMMENT_TO_TICKET: handleNewComment(action); break;
        case ActionConstants.BID_ON_AUCTION: handleModifiedAuction(action); break;
        case ActionConstants.GET_COMMENT_DETAIL: handleCommentDetail(action); break;
        default: return true;
    }
    AuctionStore.emitChange();
    return true;
});

function addSyntheticProperties(auction) {
    Object.defineProperty(auction, 'ticket', {
        get: function() { return auction.ticket_set.bid_limits[0].ticket_snapshot.ticket; },
        set: function(ticket) { auction.ticket_set.bid_limits[0].ticket_snapshot.ticket = ticket; },
        configurable: true, // a hack to let us repeatedly set the property so we don't have to be careful
    });
    Object.defineProperty(auction, 'contract', {
        get: function() { return auction.bids[0].contract; },
        configurable: true, // a hack to let us repeatedly set the property so we don't have to be careful
    });
    return auction;
}

function handleNewAuctionData(action) {
    switch (action.status) {
        case RequestConstants.PENDING: _loading = true; break;
        case RequestConstants.TIMEOUT: _loading = false; console.warn(action.response); break;
        case RequestConstants.ERROR: _loading = false; console.warn(action.response); break;
        case null: _loading = false; console.warn('Undefined data!');
        default:
            _loading = false;
            _allAuctions = action.response.auctions;
            _allAuctions.forEach(auction => addSyntheticProperties(auction));
    }
}

function handleCreateAuction(action) {
    switch (action.status) {
        case RequestConstants.PENDING: _loading = true; break;
        case RequestConstants.TIMEOUT: _loading = false; console.warn(action.response); break;
        case RequestConstants.ERROR: _loading = false; console.warn(action.response); break;
        case null: _loading = false; console.warn('Undefined data!');
        case RequestConstants.SUCCESS:
            _loading = false;
            _allAuctions.push(addSyntheticProperties(action.response.auction));
            handleSelectedAuction(action.response.auction.id);
            break;
        default: console.warn('Invalid status given to CREATE_AUCTION: ', action.status); break;
    }
}

function handleSelectedAuction(id) {
    _currentAuction = _allAuctions.filter(auction => auction.id == id)[0];
}

function handleNewComment(action) {
    switch (action.status) {
        case RequestConstants.PENDING: _loading = true; break;
        case RequestConstants.TIMEOUT: _loading = false; console.warn(action.response); break;
        case RequestConstants.ERROR: _loading = false; console.warn(action.response); break;
        case null: _loading = false; console.warn('Null data!');
        default:
            _loading = false;
            var new_comment = action.response.comment;
            _allAuctions.forEach(auction => { if (auction.ticket.id == new_comment.ticket.id) { auction.ticket.comments.push(new_comment) } });
            break;
    }
}

function handleModifiedAuction(action) {
    switch (action.status) {
        case RequestConstants.PENDING: _loading = true; break;
        case RequestConstants.TIMEOUT: _loading = false; console.warn(action.response); break;
        case RequestConstants.ERROR: _loading = false; console.warn(action.response); break;
        case null: _loading = false; console.warn('Null data!'); break;
        default:
            _loading = false;
            var modified_auction = action.response.auction;
            _allAuctions = _allAuctions.map(auction => auction.id == modified_auction.id ? addSyntheticProperties(modified_auction) : auction);
            _currentAuction = _currentAuction.id == modified_auction.id ? addSyntheticProperties(modified_auction) : _currentAuction;
            break;
    }
}

function handleCommentDetail(action) {
    switch (action.status) {
        case RequestConstants.PENDING: _loading = true; break;
        case RequestConstants.TIMEOUT: _loading = false; console.warn(action.response); break;
        case RequestConstants.ERROR: _loading = false; console.warn(action.response); break;
        case null: _loading = false; console.warn('Null data!');
        default: {
            _loading = false;
            var detailed_comment = action.response.comment;
            _allAuctions.forEach(auction => auction.ticket.comments.forEach(comment => { comment = comment.id == detailed_comment.id ? detailed_comment : comment }));
            break;
        }
    }
}

module.exports = new Dispatcher();
`

exports.REACT_CODE = REACT_CODE;
exports.D3_CODE = D3_CODE;
exports.FETCH_CODE = FETCH_CODE;
exports.COMMONJS_CODE = COMMONJS_CODE;
