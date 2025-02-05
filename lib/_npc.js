"use strict";

// Should all be language neutral



const NPC = function(isFemale) {
  // A whole bunch of defaults are the same as the player
  const res = Object.assign({}, CHARACTER(), CONSULTABLE(), AGENDA_FOLLOWER());
  
  res.npc = true;
  res.isFemale = isFemale;
  res.pronouns = isFemale ? lang.pronouns.female : lang.pronouns.male;
  
  res.talktoCount = 0;
  res.askOptions = [];
  res.tellOptions = [];
  res.excludeFromAll = true;
  res.reactions = NULL_FUNC;
  res.canReachThrough = () => false;
  res.icon = () => 'npc12'

  res.isAtLoc = function(loc, situation) {
    if (situation === world.LOOK && this.scenery) return false;
    if (situation === world.SIDE_PANE && this === game.player) return false;
    return (this.loc === loc);
  };
  
  res.heading = function(dir) {
    return lang.go_successful
  };

  // This does not work properly, it just gets all clothing!!!
  // But authors could replace as required
  res.getWearingVisible = function() {
    return this.getWearing();
  };
  
  res.getTopics = npc_utilities.getTopics;
  
  res.isHere = function() {
    return this.isAtLoc(game.player.loc);
  }
  
  res.msg = function(s, params) {
    if (this.isHere()) msg(s, params);
  }
  
  res.multiMsg = function(ary) {
    if (!this.isHere()) return;
    const counter = ary[0].replace(/[^a-z]/ig, '');
    if (this[counter] === undefined) this[counter] = -1;
    this[counter]++;
    if (this[counter] >= ary.length) this[counter] = ary.length - 1;
    if (ary[this[counter]]) msg(ary[this[counter]]);
  }
  
  
  
  
  res.inSight = function() {
    if (this.isHere()) return true
    if (!this.loc) return false
    const room = w[this.loc]
    if (room.visibleFrom === undefined) return false
    if (typeof room.visibleFrom === 'function') return room.visibleFrom()
    for (let loc of room.visibleFrom) {
      if (game.player.loc === loc) return true
    }
    return false
  }
  
  res.setLeader = function(npc) {
    npc.followers.push(this.name)
    this.leaderName = npc.name
  }
  
  res.unsetLeader = function() {
    array.remove(w[this.leaderName].followers, this.name)
    this.leaderName = false
  }
  
  res.getFollowers = function() {
    return this.followers.map(el => w[el])
  }

  res.doEvent = function() {
    if (this.dead) return
    this.sayTakeTurn()
    this.doReactions();
    if (!this.paused && !this.suspended && this.agenda && this.agenda.length > 0) this.doAgenda();
  };
  
  res.doReactions = function() {
    if (this.isHere() || settings.npcReactionsAlways) {
      if (typeof this.reactions === "function") {
        this.reactions()
      }
      else {
        if (!this.reactionFlags) this.reactionFlags = []
        for (const el of this.reactions) {
          if (this.reactionFlags.includes(el.name)) continue
          if (el.test(this)) {
            el.action(this)
            this.reactionFlags.push(el.name)
            if (el.override) this.reactionFlags = this.reactionFlags.concat(el.override)
          }
          
        }
      }
    }
  };
  
  


  

  res.talkto = npc_utilities.talkto;
  
  // For ASK/TELL
  res.topics = function() {
    if (this.askOptions.length === 0 && this.tellOptions.length === 0) {
      metamsg(lang.topics_no_ask_tell);
      return world.SUCCESS_NO_TURNSCRIPTS;
    }

    let flag = false;
    for (let action of ['ask', 'tell']) {
      const arr = getResponseList({actor:this, action:action}, this[action + 'Options']);
      const arr2 = []
      for (let res of arr) {
        if (res.silent && !game.player.mentionedTopics.includes(res.name)) continue
        arr2.push(res.name)
      }
      if (arr2.length !== 0) {
        metamsg(lang['topics_' + action + '_list'], {item:this, list:arr2.sort().join('; ')});
        flag = true;
      }
    }

    if (!flag) {
      metamsg(lang.topics_none_found, {item:this})
    }
    
    return settings.lookCountsAsTurn ? world.SUCCESS : world.SUCCESS_NO_TURNSCRIPTS
  }
  
  res.sayBonus = 0;
  res.sayPriority = 0;
  res.sayState = 0;
  res.sayUsed = " ";
  res.sayResponse = function(s) {
    if (!this.sayResponses) return false;
    for (let res of this.sayResponses) {
      if (res.id && this.sayUsed.includes(" " + res.id + " ")) continue;
      if (!res.regex.test(s)) continue;
      res.response();
      if (res.id) this.sayUsed += res.id + " "
      return true;
    }
    return false;
  };
  res.sayCanHear = function(actor, verb) {
    return actor.loc === this.loc;
  };
  res.askQuestion = function(questionName) {
    if (typeof questionName !== "string") questionName = questionName.name;
    this.sayQuestion = questionName
    this.sayQuestionCountdown = settings.turnsQuestionsLast
    this.sayBonus = 100
  };
  res.sayTakeTurn = function(questionName) {
    if (this.sayQuestionCountdown <= 0) return;
    this.sayQuestionCountdown--;
    if (this.sayQuestionCountdown > 0) return;
    this.sayQuestion = false
    this.sayBonus = 0;
  };

  return res;
};



const npc_utilities = {
  talkto:function() {
    if (!game.player.canTalk(this)) {
      return false;
    }
    if (settings.noTalkTo !== false) {
      metamsg(settings.noTalkTo);
      return false;
    }
    
    const topics = this.getTopics(this);
    game.player.conversingWithNpc = this
    if (topics.length === 0) return failedmsg(lang.no_topics, {char:game.player, item:this});
    
    this.talktoCount++
    if (this.greeting) {
      printOrRun(this, this, "greeting");
    }
    topics.push(lang.never_mind)
    
    const fn = io.menuFunctions[settings.funcForDynamicConv]
    fn(lang.speak_to_menu_title(this), topics, function(result) {
      if (result !== lang.never_mind) {
        result.runscript();
      }
      $('#sidepane-menu').remove()  // only needed for showMenuDiag, but do in just in case
    })
    
    return world.SUCCESS_NO_TURNSCRIPTS;
  },
  
  getTopics:function() {
    const list = [];
    for (let key in w) {
      if (w[key].isTopicVisible && w[key].isTopicVisible(this)) {
        list.push(w[key]);
      }
    }
    return list;
  },
 
}



const AGENDA_FOLLOWER = function() {
  const res = {}
  res.agenda = []
  res.suspended = false
  res.followers = []
  res.inSight = function() { return false }
  res.doEvent = function() {
    if (!this.paused && !this.suspended && this.agenda.length > 0) this.doAgenda()
  }
  
  res.setAgenda = function(agenda) {
    this.agenda = agenda
    this.suspended = false
    this.agendaWaitCounter = false
    this.patrolCounter = false
  }
  
  res.doAgenda = function() {
    // If this NPC has followers, we fake it so it seems to be the group
    if (this.followers.length !== 0) {
      this.savedPronouns = this.pronouns;
      this.savedAlias = this.alias
      this.pronouns = lang.pronouns.plural;
      this.followers.unshift(this.name);
      this.alias = formatList(this.getFollowers(), {lastJoiner:lang.list_and});
      this.followers.shift();
    }

    const arr = this.agenda[0].split(":");
    const fn = arr.shift();
    if (typeof agenda[fn] !== "function") {
      errormsg("Unknown function `" + fn + "' in agenda for " + this.name);
      return;
    }
    const flag = agenda[fn](this, arr);
    if (flag) this.agenda.shift();
    
    // If we are faking the group, reset
    if (this.savedPronouns) {
      this.pronouns = this.savedPronouns
      this.alias = this.savedAlias
      this.savedPronouns = false
    }
  }
  
  /*
  res.templatePreSave = function() {
    if (this.agenda) this.customSaveAgenda = this.agenda.join("^");
    this.preSave();
  }

  res.templatePostLoad = function() {
    if (this.customSaveAgenda) this.agenda = this.customSaveAgenda.split("^")
    this.customSaveAgenda = false
    if (this.leaderName) w[this.leaderName].followers.push(this)
    this.postLoad()
  }*/

  res.pause = function() {
    //debugmsg("pausing " + this.name);
    if (this.leaderName) {
      w[this.leaderName].pause();
    }
    else {
      this.paused = true;
    }
  }
  
  return res
}


const agenda = {
  debug:function(s, npc, arr) {
    if (settings.agendaDebugging && settings.playMode === 'dev') debugmsg('AGENDA for ' + npc.name + ': ' + s + '; ' + formatList(arr, {doNotSort:true}))
  },
  debugS:function(s) {
    if (settings.agendaDebugging && settings.playMode === 'dev') debugmsg('AGENDA comment: ' + s)
  },

  
  // wait one turn
  pause:function(npc, arr) {
    return true;
  },

  // print the array as text if the player is here
  // otherwise this will be skipped
  // Used by several other functions, so this applies to them too
  text:function(npc, arr) {
    if (typeof npc[arr[0]] === "function") {
      this.debug("text (function)", npc, arr);
      const fn = arr.shift();
      const res = npc[fn](arr);
      return (typeof res === "boolean" ? res : true);
    }
    this.debug("text (string)", npc, arr);
    
    if (npc.inSight()) msg(arr.join(':'))
    return true;
  },
  
  // Alias for text
  run:function(npc, arr) { return this.text(npc, arr) },
  
  // sets one attribute on the given item
  // it will guess if Boolean, integer or string
  setItemAtt:function(npc, arr) {
    this.debug("setItemAtt", npc, arr)
    const item = arr.shift()
    const att = arr.shift()
    let value = arr.shift()
    if (!w[item]) errormsg("Item '" + item + "' not recognised in the agenda of " + npc.name)
    if (value === "true") value = true
    if (value === "false") value = false
    if (/^\d+$/.test(value)) value = parseInt(value)
    w[item][att] = value
    this.text(npc, arr)
    return true
  },

  // Wait n turns
  wait:function(npc, arr) {
    this.debug("wait", npc, arr);
    if (arr.length === 0) return true;
    if (isNaN(arr[0])) errormsg("Expected wait to be given a number in the agenda of '" + npc.name + "'");
    const count = parseInt(arr.shift());
    if (npc.agendaWaitCounter !== undefined) {
      npc.agendaWaitCounter++;
      if (npc.agendaWaitCounter >= count) {
        this.debugS("Pass")
        this.text(npc, arr);
        return true;
      }
      return false;
    }
    npc.agendaWaitCounter = 1;
    return false;
  },

  // Wait until ...
  // This may be repeated any number of times
  waitFor:function(npc, arr) {
    this.debug("waitFor", npc, arr);
    let name = arr.shift();
    if (typeof npc[name] === "function") {
      if (npc[name](arr)) {
        this.text(npc, arr);
        this.debugS("Pass")
        return true;
      }
      else {
        return false;;
      }
    }
    else {
      if (name === "player") name = game.player.name;
      if (npc.isHere()) {
        this.text(npc, arr);
        this.debugS("Pass")
        return true;
      }
      else {
        return false;;
      }
    }
  },
  
  joinedBy:function(npc, arr) {
    this.debug("joinedBy", npc, arr);
    const followerName = arr.shift();
    w[followerName].setLeader(npc);
    this.text(npc, arr);
    return true;
  },
  
  joining:function(npc, arr) {
    this.debug("joining", npc, arr);
    const leaderName = arr.shift();
    npc.setLeader(w[leaderName]);
    this.text(npc, arr);
    return true;
  },
  
  disband:function(npc, arr) {
    this.debug("disband", npc, arr)
    for (let s of npc.followers) {
      const follower = w[s]
      follower.leader = false
    }
    npc.followers = []
    this.text(npc, arr)
    return true
  },
  
  // Move the given item directly to the given location, then print the rest of the array as text
  // Do not use for items with a funny location, such as COUNTABLES
  moveItem:function(npc, arr) {
    this.debug("moveItem", npc, arr)
    const item = arr.shift()
    let dest = arr.shift()
    if (dest === "player") {
      dest = game.player.name
    }
    else if (dest === "_") {
      dest = false
    }
    else {
      if (!w[dest]) return errormsg("Location '" + dest + "' not recognized in the agenda of " + npc.name)
    }
    w[item].moveToFrom(dest)
    this.text(npc, arr)
    return true
  },

  // Move directly to the given location, then print the rest of the array as text
  // Use "player" to go directly to the room the player is in.
  // Use an item (i.e., an object not flagged as a room) to have the NPC move
  // to the room containing the item.
  moveTo:function(npc, arr) {
    let dest = arr.shift()
    if (dest === "player") {
      dest = game.player.loc
    }
    else if (dest === "_") {
      dest = false
    }
    else {
      if (!w[dest]) return errormsg("Location '" + dest + "' not recognised in the agenda of " + npc.name)
      if (!w[dest].room) dest = dest.loc  // go to the room the item is in
      if (!w[dest]) return errormsg("Location '" + dest + "' not recognized in the agenda of " + npc.name)
    }
    npc.moveChar(dest)
    this.text(npc, arr)
    return true
  },
  
  patrol:function(npc, arr) {
    this.debug("patrol", npc, arr);
    if (npc.patrolCounter === undefined) npc.patrolCounter = -1;
    npc.patrolCounter = (npc.patrolCounter + 1) % arr.length;
    this.moveTo(npc, [arr[npc.patrolCounter]]);
    return false;
  },

  // Move to another room via a random, unlocked exit, then print the rest of the array as text
  walkRandom:function(npc, arr) {
    this.debug("walkRandom", npc, arr);
    const exit = w[npc.loc].getRandomExit(true);
    if (exit === null) {
      this.text(npc, arr);
      return true;
    }
    if (!w[exit.name]) errormsg("Location '" + exit.name + "' not recognised in the agenda of " + npc.name);
    npc.moveChar(exit.name, exit.dir)
    return false;
  },

  // Move to the given location, using available, unlocked exits, one room per turn
  // then print the rest of the array as text
  // Use "player" to go to the room the player is in (if the player moves, the NPC will head
  // to the new position, but will be omniscient!).
  // Use an item (i.e., an object not flagged as a room) to have the NPC move
  // to the room containing the item.
  // This may be repeated any number of turns
  walkTo:function(npc, arr) {
    this.debug("walkTo", npc, arr);
    let dest = arr.shift();
    if (dest === "player") dest = game.player.loc;
    if (w[dest] === undefined) {
      errormsg("Location '" + dest + "' not recognised in the agenda of " + npc.name);
      return true;
    }
    if (!w[dest].room) {
      dest = w[dest].loc;
      if (w[dest] === undefined) {
        errormsg("Object location '" + dest + "' not recognised in the agenda of " + npc.name);
        return true;
      }
    }
    if (npc.isAtLoc(dest)) {
      this.text(npc, arr);
      return true;
    }
    else {
      const route = agenda.findPath(w[npc.loc], w[dest]);
      if (!route) errormsg("Location '" + dest + "' not reachable in the agenda of " + npc.name)
      npc.moveChar(route[0], w[npc.loc].findExit(route[0]).dir)
      if (npc.isAtLoc(dest)) {
        this.text(npc, arr);
        return true;
      }
      else {
        return false;
      }
    }
  },

  
}




// start and end are the objects, not their names!
agenda.findPath = function(start, end, maxlength) {
  if (start === end) return [];
  
  if (!game.pathID) game.pathID = 0;
  if (maxlength === undefined) maxlength = 999;
  game.pathID++;
  let currentList = [start];
  let length = 0;
  let nextList, dest, exits;
  start.pathfinderNote = { id:game.pathID };
  
  // At each iteration we look at the rooms linked from the previous one
  // Any new rooms go into nextList
  // Each room gets flagged with "pathfinderNote"
  while (currentList.length > 0 && length < maxlength) {
    nextList = [];
    length++;
    for (let room of currentList) {
      exits = room.getExits({npc:true});
      for (let exit of exits) {
        if (exit.name === '_') continue
        dest = w[exit.name];
        if (dest === undefined) {
          errormsg("Dest is undefined: " + exit.name + ' (room ' + room.name + '). Giving up.');
          console.log(this)
          return false
        }
        if (dest.pathfinderNote && dest.pathfinderNote.id === game.pathID) continue;
        dest.pathfinderNote = { jumpFrom:room, id:game.pathID };
        if (dest === end) return agenda.extractPath(start, end);
        nextList.push(dest);
      }
    }
    currentList = nextList;
  }
  return false
  /*console.error("Path-finding failed: " + (currentList.length === 0 ? 'list is empty' : 'exceeded maximum length'))
  log("start: " + start.name)
  log("end: " + end.name)
  log("maxlength: " + maxlength)
  console.trace()
  throw("Path-finding failed, see comments above.")*/
}
    
agenda.extractPath = function(start, end) {
  let res = [end];
  let current = end;
  let count = 0;

  do {
    current = current.pathfinderNote.jumpFrom;
    res.push(current);
    count++;
  } while (current !== start && count < 99);
  res.pop();  // The last is the start location, which we do not ned
  return res.reverse();
}



const CONSULTABLE = function() {
  const res = {}

  res.askabout = function(text1, text2) { return this.asktellabout(text1, text2, lang.ask_about_intro, this.askOptions, "ask"); },
  res.tellabout = function(text1, text2) { return this.asktellabout(text1, text2, lang.tell_about_intro, this.tellOptions, "tell"); },
  res.asktellabout = function(text1, text2, intro, list, action) {
    if (!game.player.canTalk(this)) {
      return false;
    }
    if (settings.noAskTell !== false) {
      metamsg(settings.noAskTell);
      return false;
    }
    if (!list || list.length === 0) {
      metamsg(settings.noAskTell);
      return errormsg("No " + action + "Options set for " + this.name + " and I think there should at least be default saying why.")
    }
    if (settings.givePlayerAskTellMsg) msg(intro(this, text1, text2));
    
    const params = {
      text:text1,
      text2:text2,
      actor:this,
      action:action,      
    }
    return respond(params, list, this.askTellDone)
  }
  res.askTellDone = function(params, response) {
    if (!response) {
      msg(lang.npc_no_interest_in, params)
      return
    }
    if (response.mentions) {
      for (let s of response.mentions) {
        if (!game.player.mentionedTopics.includes(s)) game.player.mentionedTopics.push(s)
      }
    }
    params.actor.pause();
  } 

  return res;
};



const QUESTION = function() {
  const res = {
    sayResponse:function(actor, s) {
      for (let res of this.responses) {
        if (!res.regex || res.regex.test(s)) {
          actor.sayBonus = 0
          actor.sayQuestion = false
          res.response(s)
          return true
        }
      }
      return false
    },
  }
  return res
}


const TOPIC = function(fromStart) {
  const res = {
    conversationTopic:true,
    showTopic:fromStart,
    hideTopic:false,
    hideAfter:true,
    properName:true, // we do not want "the" prepended
    nowShow:[],
    nowHide:[],
    count:0,
    isAtLoc:() => false,
    belongsTo:function(loc) { return this.loc === loc },
    eventPeriod:1,
    eventIsActive:function() { this.showTopic && !this.hideTopic && this.countdown },
    eventScript:function() { 
      this.countdown--
      if (this.countdown < 0) this.hide()
    },
    findTopic:function(name) {
      if (w[name]) return w[name]
      const key = Object.keys(w).find(key => w[key].alias === name)
      return key ? w[key] : undefined
    },
    runscript:function() {
      let obj = game.player.conversingWithNpc
      if (obj === undefined) return errormsg("No conversing NPC called " + game.player.conversingWithNpc + " found.")
      obj.pause()
      this.hideTopic = this.hideAfter
      if (typeof this.script !== "function") return errormsg("script for topic " + this.name + " is not a function.")
      this.script(obj)
      if (typeof this.nowShow === "string") return errormsg("nowShow for topic " + this.name + " is a string.")
      for (let s of this.nowShow) {
        const o = this.findTopic(s)
        if (o === undefined) return errormsg("No topic called " + s + " found.")
        o.show();
      }
      if (typeof this.nowHide === "string") return errormsg("nowHide for topic " + this.name + " is a string.")
      for (let s of this.nowHide) {
        const o = this.findTopic(s)
        if (o === undefined) return errormsg("No topic called " + s + " found.")
        o.hide();
      }
      this.count++;
      world.endTurn(world.SUCCESS)
    },
    isTopicVisible:function(char) {
      return this.showTopic && !this.hideTopic && this.belongsTo(char.name)
    },
    show:function() {
      return this.showTopic = true
    },
    hide:function() {
      return this.hideTopic = true
    },
  };
  return res;
};