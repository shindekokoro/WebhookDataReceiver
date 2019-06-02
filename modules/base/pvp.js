const Discord = require('discord.js');

module.exports =  {
  CalculatePossibleCPs: function (MAIN, pokemonID, formID, attack, defense, stamina, level, gender, minCP, maxCP) {

    let possibleCPs = [];

    // Check for required gender on evolution
    if(MAIN.masterfile.pokemon[pokemonID].gender_requirement  && MAIN.masterfile.pokemon[pokemonID].gender_requirement != gender) {
      return possibleCPs;
    }

    for(var i = level; i <= 40; i += .5) {
      let currentCP = CalculateCP(MAIN, pokemonID, formID, attack, defense, stamina, i);
      if(currentCP >= minCP && currentCP <= maxCP) {
        possibleCPs.push({pokemonID:pokemonID, formID: formID, attack:attack, defense:defense, stamina:stamina, level:i, cp:currentCP});
      }
      if(currentCP > maxCP) { i = 41; }
    }

    // IF no data about possible evolutions just return now rather than moving on
    if(!MAIN.masterfile.pokemon[pokemonID].evolutions){ return possibleCPs; }

    for(var i = 0; i < MAIN.masterfile.pokemon[pokemonID].evolutions.length; i++) {
      //Check for Evolution Form
      if (formID > 0){
        if(!MAIN.masterfile.pokemon[pokemonID].forms[formID]){
            evolvedForm = MAIN.masterfile.pokemon[MAIN.masterfile.pokemon[pokemonID].evolutions[i]].default_form;
          } else{
            evolvedForm = MAIN.masterfile.pokemon[pokemonID].forms[formID].evolved_form;
          }
      } else if (MAIN.masterfile.pokemon[pokemonID].evolved_form){
        evolvedForm = MAIN.masterfile.pokemon[pokemonID].evolved_form;
      } else { evolvedForm = formID; }

      possibleCPs = possibleCPs.concat(CalculatePossibleCPs(MAIN,MAIN.masterfile.pokemon[pokemonID].evolutions[i], evolvedForm, attack, defense, stamina, level, gender, minCP, maxCP));
    }

    return possibleCPs;
  },

  CalculateCP: function (MAIN, pokemonID, formID, attack , defense, stamina, level) {
  	let CP = 0;
    let pokemonAttack = 0, pokemonDefense = 0, pokemonStamina = 0;
  	let remainder = level % 1;
  	level = Math.floor(level);

  	let cpIndex = ((level * 2) - 2) + (remainder * 2);
  	let CPMultiplier = MAIN.cp_multiplier.CPMultiplier[cpIndex];

    if(!MAIN.masterfile.pokemon[pokemonID].attack)
    {
      if(!MAIN.masterfile.pokemon[pokemonID].forms[formID] || !MAIN.masterfile.pokemon[pokemonID].forms[formID].attack){
        console.log("Can't find attack of Pokemon ID: "+pokemonID+' Form:'+formID);
      }
      pokemonAttack = MAIN.masterfile.pokemon[pokemonID].forms[formID].attack;
    	pokemonDefense = MAIN.masterfile.pokemon[pokemonID].forms[formID].defense;
    	pokemonStamina = MAIN.masterfile.pokemon[pokemonID].forms[formID].stamina;
    } else {
      pokemonAttack = MAIN.masterfile.pokemon[pokemonID].attack;
    	pokemonDefense = MAIN.masterfile.pokemon[pokemonID].defense;
    	pokemonStamina = MAIN.masterfile.pokemon[pokemonID].stamina;
    }


  	let attackMultiplier = pokemonAttack + parseInt(attack);
  	let defenseMultiplier = Math.pow(pokemonDefense + parseInt(defense),.5);
  	let staminaMultiplier = Math.pow(pokemonStamina + parseInt(stamina),.5);
  	CPMultiplier = Math.pow(CPMultiplier,2);

  	CP = (attackMultiplier * defenseMultiplier * staminaMultiplier * CPMultiplier) / 10;

  	CP = Math.floor(CP);

  	//CP floor is 10
  	if(CP < 10)  {CP = 10}


  	return CP;
  },

  CalculateTopRanks: function(MAIN, pokemonID, formID, cap) {
      let currentPokemon = InitializeBlankPokemon();
      let bestStat = {attack: 0, defense: 0, stamina: 0, value: 0};
      let arrayToSort = [];

      for(a = 0; a <= 15; a++) {
          for(d = 0; d <= 15; d++) {
              for(s = 0; s <= 15; s++) {
                  let currentStat = CalculateBestPvPStat(MAIN, pokemonID, formID, a, d, s, cap);

                  if(currentStat > bestStat.value) {
                      bestStat = {attack: a, defense: d, stamina: s, value: currentStat.value, level: currentStat.level};
                  }

                  currentPokemon[a][d][s] = {value: currentStat.value, level: currentStat.level }

                  arrayToSort.push({attack:a, defense:d, stamina:s, value:currentStat.value});
              }
          }
      }

      arrayToSort.sort(function(a,b) {
          return b.value - a.value;
      });

      let best = arrayToSort[0].value;

      for(var i = 0; i < arrayToSort.length; i++)
      {
          let percent = PrecisionRound((arrayToSort[i].value / best) * 100, 2);
          arrayToSort[i].percent = percent;
          currentPokemon[arrayToSort[i].attack][arrayToSort[i].defense][arrayToSort[i].stamina].percent = percent;
          currentPokemon[arrayToSort[i].attack][arrayToSort[i].defense][arrayToSort[i].stamina].rank = i+1;
      }

      return currentPokemon;
  },

  CalculateBestPvPStat: function (MAIN, pokemonID, formID, attack, defense, stamina, cap) {
      let bestStat = 0;
      let level = 0;
      for(var i = 1; i <= 40; i += .5)
      {
          let CP = CalculateCP(MAIN, pokemonID, formID, attack, defense, stamina, i);
          if(CP <= cap)
          {
              let stat = CalculatePvPStat(MAIN, pokemonID, formID, i, attack, defense, stamina);
              if(stat > bestStat)
              {
                  bestStat = stat;
                  level = i;
              }
          }
          else if(CP > cap)
          {
            i = 41;
          }
      }

      return {value: bestStat, level: level};
  },

  CalculatePvPStat: function (MAIN, pokemonID, formID, level, attack, defense, stamina) {
      let remainder = level % 1;
      let cpIndex = ((level * 2) - 2) + (remainder * 2);
      level = Math.floor(level);

      if(!MAIN.masterfile.pokemon[pokemonID].attack){
        attack = (attack + MAIN.masterfile.pokemon[pokemonID].forms[formID].attack) * MAIN.cp_multiplier.CPMultiplier[cpIndex];
        defense = (defense + MAIN.masterfile.pokemon[pokemonID].forms[formID].defense) * MAIN.cp_multiplier.CPMultiplier[cpIndex];
        stamina = (stamina + MAIN.masterfile.pokemon[pokemonID].forms[formID].stamina) * MAIN.cp_multiplier.CPMultiplier[cpIndex];

      } else {
        attack = (attack + MAIN.masterfile.pokemon[pokemonID].attack) * MAIN.cp_multiplier.CPMultiplier[cpIndex];
        defense = (defense + MAIN.masterfile.pokemon[pokemonID].defense) * MAIN.cp_multiplier.CPMultiplier[cpIndex];
        stamina = (stamina + MAIN.masterfile.pokemon[pokemonID].stamina) * MAIN.cp_multiplier.CPMultiplier[cpIndex];
      }

      product = attack * defense * Math.floor(stamina);

      product = Math.round(product);

      return product;
  },

  InitializeBlankPokemon: function (){
      let newPokemon = {};

      for(var a = 0; a <= 15; a++)
      {
          newPokemon[a] = {};

          for(var d = 0; d <= 15; d++)
          {
              newPokemon[a][d] = {};

              for(var s = 0; s <= 15; s++)
              {
                  newPokemon[a][d][s] = {};
              }
          }
      }

      return newPokemon;
  },

  PrecisionRound: function (number, precision) {
  	var factor = Math.pow(10, precision);
  	return Math.round(number * factor) / factor;
  },

  FilterPossibleCPsByRank: function (possibleCPs, minRank = 4096){
    let returnCPs = {};

    for(var pokemon in possibleCPs)
    {
      if(possibleCPs[pokemon].rank <= minRank)
      {
        returnCPs[pokemon] = possibleCPs[pokemon];
      }
    }
    return returnCPs;
  },

  FilterPossibleCPsByPercent: function (possibleCPs, minPercent = 0) {
    let returnCPs = {};

    for(var pokemon in possibleCPs)
    {
      if(possibleCPs[pokemon].percent >= minPercent)
      {
        returnCPs[pokemon] = possibleCPs[pokemon];
      }
    }
    return returnCPs;
  }
}
