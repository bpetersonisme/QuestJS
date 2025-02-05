"use strict";






quest.create('A carrot for Buddy', [
  {text:'Go find a carrot.'},
  {text:'Give the carrot to Buddy.'},
])








commands.unshift(new Cmd('Test input', {
  npcCmd:true,
  rules:[cmdRules.isHere],
  regex:/^inp/,
  script:function() {
    msg("First some preamble...")
    showMenu("What colour?", [w.book, w.coin, w.Kyle, 'None of them'], function(result) {
      if (typeof result === 'string') {
        msg("You picked " + result + ".");
      }
      else {
        msg("You picked " + lang.getName(result, {article:DEFINITE}) + ".");
      }
    })
/*    askQuestion("What colour?", function(result) {
      msg("You picked " + result + ".");
      showYesNoMenu("Are you sure?", function(result) {
        msg("You said " + result + ".")
      })
    })*/
  }
}));



commands.unshift(  new Cmd('TextReveal', {
  regex:/^reveal$/,
  script:function() {
    msg("Some text")
    msg("More")
    _msg("The characters will appear randomly from dots.", {}, {action:'effect', tag:'p', effect:io.unscrambleEffect, randomPlacing:true, pick:function() {return '.' }})
    wait()
    _msg("Or appears as though typed.", {}, {action:'effect', tag:'p', effect:io.typewriterEffect})
    _msg("The real message is revealed!!", {}, {action:'effect', tag:'pre', effect:io.unscrambleEffect, randomPlacing:true, incSpaces:true, pick:function(i) {return 'At first this message is shown'.charAt(i) }})
    wait()
    clearScreen()
    msg("Some more text.")
    wait(3, "Wait three seconds...")
    msg("... and done!")/**/
  },
}));
  
commands.unshift(  new Cmd('Image', {
  regex:/^img$/,
  script:function() {
    msg("Some more text.")
    picture('favicon.png')
  },
}));
  
commands.unshift(  new Cmd('Audio', {
  regex:/^beep$/,
  script:function() {
    msg("Can you hear this?")
    sound('hrn06.wav')
  },
}));
  



commands.unshift(  new Cmd('Alpha', {
  regex:/^alpha$/,
  script:function() {
    msg("Some text in Greek: {encode:391:3AC:The quick brown fox jumped over the lazy dog}.")
    msg("Some text in Cyrillic: {encode:402:431:The quick brown fox jumped over the lazy dog}.")
    msg("Some text in Armenian {encode:531:561:The quick brown fox jumped over the lazy dog}.")

    msg("Some text in Devanagari: {encode:904:904:The quick brown fox jumped over the lazy dog}.")
    msg("Some text in Thai {encode:E01:E01:The quick brown fox jumped over the lazy dog}.")
    msg("Some text in Tibetan {encode:F20:F20:The quick brown fox jumped over the lazy dog}.")
    msg("Some text in Khmer {encode:1780:1780:The quick brown fox jumped over the lazy dog}.")
    msg("Some text in Javan {encode:A985:A985:The quick brown fox jumped over the lazy dog}.")
    msg("Some text in Nko {encode:7C1:7C1:The quick brown fox jumped over the lazy dog}.")
  },
}));
  





commands.unshift(new Cmd('EgKick', {
  npcCmd:true,
  rules:[cmdRules.isHere],
  regex:/^(kick) (.+)$/,
  objects:[
    {special:'ignore'},
    {scope:parser.isPresent}
  ],
  default:function(item, isMultiple, char) {
    return failedmsg(prefix(this, isMultiple) + lang.pronounVerb(char, "kick", true) + " " + this.pronouns.objective + ", but nothing happens.");
  },
}));



commands.unshift(new Cmd('EgCharge', {
  npcCmd:true,
  rules:[cmdRules.isHeld],
  regex:/^(charge) (.+)$/,
  objects:[
    {special:'ignore'},
    {scope:parser.isHeld}
  ],
  default:function(item, isMultiple, char) {
    return failedmsg(prefix(item, isMultiple) + lang.pronounVerb(item, "'be", true) + " not something you can charge.");
  },
}));


commands.unshift(new Cmd('EgMove', {
  npcCmd:true,
  rules:[cmdRules.isHere],
  regex:/^(move) (.+)$/,
  objects:[
    {special:'ignore'},
    {scope:parser.isHere}
  ],
  default:function(item, isMultiple, char) {
    return failedmsg(prefix(item, isMultiple) + lang.pronounVerb(item, "'be", true) + " not something you can move.");
  },
}));

findCmd('MetaHint').script = function() {
  if (w[game.player.loc].hint) {
    metamsg(w[game.player.loc].hint);
  }
  else {
    return lang.hintScript()
  }
}
  


const clues = [
  {
    question:'How do I get the hat?',
    clues: [
      'What is the lamp for?',
      'What happens if you rub the lamp?',
      'Rub the lamp, and ask the genie.',
    ],
  },
  {
    question:'Where is the bear?',
    clues: [
      'In the lounge, where you started.',
    ],
  },
]


// How to save???
findCmd('MetaHint').script = function() {
  for (let clue of clues) {
    if (clue.count === undefined) clue.count = 0
    metamsg(clue.question)
    for (let i = 0; i < clue.clues.length; i++) {
      if (i < clue.count) {
        metamsg(clue.clues[i])
      }
      else {
        // hidden!!!
        metamsg(clue.clues[i])
      }
    }
  }
}
 






tp.addDirective("charger_state", function(){
  if (w.charger_compartment.closed) {
    return "The compartment is closed";
  }
  const contents = w.charger_compartment.getContents(world.LOOK);
  if (contents.length === 0) {
    return "The compartment is empty";
  }
  return "The compartment contains " + formatList(contents, {article:INDEFINITE});
});




commands.unshift(new Cmd('SliceCarrot', {
  rules:[cmdRules.isHeld],
  regexes:[/^use (.+) to slice (.+)$/, /^use (.+) slice (.+)$/, {regex:/slice (.+) with (.+)/, mod:{reverse:true}}],
  objects:[
    {scope:parser.isPresent},
    {scope:parser.isPresent},
  ],
  script:function(objects) {
    msg("You slice {nm:ob1:the} with {nm:ob2:the}.", {ob1:objects[1][0], ob2:objects[0][0]})
  },
  default:function(item, isMultiple, char) {
    return failedmsg(prefix(this, isMultiple) + "Not going to happen.");
  },
}));