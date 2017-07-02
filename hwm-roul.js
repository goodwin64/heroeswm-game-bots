// ==UserScript==
// @name         HWM Roul: catch bet
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        http://www.heroeswm.ru/roulette.php
// @grant        none
// ==/UserScript==
(function() {
	'use strict';

	var charLevel = 8;
	var maxBet = charLevel * 1000;
	var round = Math.round;

	function getMyBets(doc = document) {
		var result = {};

		var yourBetsElem = (() => {
			var arr = [].filter.call(
				doc.getElementsByTagName('b'),
				(e) => e.innerText === 'Ваши ставки'
			);
			if (arr.length > 0) return arr[0];
		})();
		if (!yourBetsElem) return result;

		var betsElemArr = (() => {
			var trs = yourBetsElem.parentElement.nextElementSibling.querySelector('tbody').children;
			return [].slice.call(trs, 1, trs.length - 1); // кроме первого и последнего
		})();

		betsElemArr.forEach((tr) => {
			var betTitle = tr.children[1].innerText;
			var betValue = +tr.children[0].innerText.replace(/,/g, '');

			result[betTitle] = betValue;
		});

		return result;
	}

	function areObjEqual(obj1, obj2) {
		var existence = obj1 && obj2;
		var keys1 = Object.keys(obj1);
		var keys2 = Object.keys(obj2);

		return existence &&
			keys1.length === keys2.length &&
			keys1.every((key) => {
				return key in obj2 && obj1[key] === obj2[key];
			});
	}

	function makeBet(betTitle, betValue) {
		var positionElem = document.querySelector(`img[title='${betTitle}']`); // Поле
		var myBetElem = document.querySelector(`input[title="Natural Number"]`); // Ставка

		positionElem.click();
		myBetElem.value = betValue;
		log(`Ставлю ${betValue} золота на "${betTitle}"`);

		checkbet(); // global, from PHP
	}

	function calculateBet(firstBet, spin, factor) {
		return round(firstBet * factor ** spin);
	}

	function $ajax(method, url, params = {}) {
		return new Promise(function(resolve, reject) {
			var xhr = new XMLHttpRequest();
			xhr.onload = function() {
				resolve(this.responseText);
			};
			xhr.onerror = reject;
			xhr.open(method, url, true);
			if (method.toLowerCase() === 'post') {
				xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
				xhr.send(params);
			} else {
				xhr.send();
			}
		});
	}

	function getDocFromString(response) {
		return new DOMParser().parseFromString(response, "text/html");
	}

	function getPrevNumber() {
		var link = [].filter.call(
			document.getElementsByTagName('a'),
			(e) => e.innerText === 'Прошлая игра'
		)[0];
		return $ajax('GET', link.href).then((lastRoulPage) => {
			var doc = getDocFromString(lastRoulPage);
			var u = [].filter.call(
				doc.getElementsByTagName('u'),
				(e) => e.firstChild.textContent.trim() === 'Выпало число'
			)[0];
			return u.querySelector('b').innerText;
		});
	}

	function updateBets() {
		var myBets = getMyBets();
		if (areObjEqual(fromGM, myBets)) {
			GM_setValue('hwm_roul_currspin', ++currSpin);
			Object.keys(fromGM).forEach((key) => {
				fromGM[key] = calculateBet(firstBet, currSpin, factor);
			});
			GM_setValue('hwm_roul_bets', JSON.stringify(fromGM));
		} else {
			Object.keys(fromGM).forEach((key) => {
				if (!(key in myBets)) {
					makeBet(key, fromGM[key]);
				}
			});
		}
	}

	function getOptionsElem() {
		return `<div id="catch-bets">
					<span class="catch-bets-span">
						First bet:
					</span>
					<input id="roul-catch-first-bet" 
						   value="${GM_getValue('hwm_roul_firstbet')}">

					<span class="catch-bets-span">
						Numbers to catch:
					</span>
					<input id="roul-catch-numbers" 
						   value="${GM_getValue('hwm_roul_bet_numbers', '')}">

					<span class="catch-bets-span">
						Current spin:
					</span>
					<input id="roul-catch-currspin" 
						   value="${GM_getValue('hwm_roul_currspin')}">

					<div class="buttons-wrapper">
						<button id="roul-catch-save-options">
							Save
						</button>
						<button id="roul-catch-status" 
								roul-catch="${GM_getValue('hwm_roul_botstatus')}">
							Catch status
						</button>
					</div>
				</div>`;
	}

	function getStyles() {
		return `<style>
				.buttons-wrapper > button {
					padding: 5px;
					border: 1px solid #ccc;
					width: 100px;
				}
				[roul-catch="on"]        { background-color: #b8ffb8; }
				[roul-catch="off"]       { background-color: #ffb8b8; }
				#roul-catch-save-options { background-color: #eeeeee; }
				.buttons-wrapper {
					display: flex;
					justify-content: center;
				}
				.catch-bets-span { width: 120px; display: inline-block; }
				#catch-bets {
					width: 360px;
					margin: 10px auto;
					padding: 10px;
					border: 2px dashed #ccc;
					position: relative;
				}
				</style>`;
	}

	function updateOptions() {
		var error = false;

		var firstBet = +document.getElementById('roul-catch-first-bet').value;
		if (typeof firstBet !== 'number' || firstBet < 100 || firstBet > maxBet) {
			error = true;
			log(`wrong firstBet, ${firstBet}`);
		}

		var numbersToCatch = document.getElementById('roul-catch-numbers').value;
		var numsArr = numbersToCatch.replace(/ /g, '').split(',');
		if (numsArr.length > 38 || numsArr.some((item) => +item < 0 || +item > 36)) {
			error = true;
			log(`wrong numbersToCatch, ${numsArr}`);
		}

		var currSpin = +document.getElementById('roul-catch-currspin').value;
		if (typeof currSpin !== 'number' || currSpin < 0 || (firstBet * factor ** currSpin) > maxBet) {
			error = true;
			log(`wrong currSpin, ${currSpin}`);
		}

		if (!error) {
			GM_setValue('hwm_roul_firstbet', firstBet);
			GM_setValue('hwm_roul_bet_numbers', numbersToCatch);
			GM_setValue('hwm_roul_currspin', currSpin);
		}
	}

	function log(data) {
		console.log(`${new Date().toLocaleString()}| ${data}`);
	}

	(function placeOptionsOnPage() {
		var tableWithBets = document.querySelector('table[width="100%"][cellspacing="0"][cellpadding="0"][border="0"][height="90"][class="wb"]');
		var itsParent = tableWithBets.parentElement;
		itsParent.insertAdjacentHTML('afterBegin', getOptionsElem());

		document.getElementById('roul-catch-status').addEventListener('click', function(event) {
			event.preventDefault();
			var status = GM_getValue('hwm_roul_botstatus');
			status = (status === 'on' ? 'off' : 'on');
			GM_setValue('hwm_roul_botstatus', status);
			this.setAttribute('roul-catch', status);
		});

		document.getElementById('roul-catch-save-options').addEventListener('click', function(event) {
			event.preventDefault();
			updateOptions();
		});

		document.body.insertAdjacentHTML('beforeEnd', getStyles());
	})();

	var numbersToCatch = document.getElementById('roul-catch-numbers').value;
	numbersToCatch = numbersToCatch ? numbersToCatch.replace(/ /g, '').split(',') : [];
	var factor = (36 / numbersToCatch.length) / (36 / numbersToCatch.length - 1);

	if (GM_getValue('hwm_roul_botstatus') === 'on') {
		var currMinute = new Date().getMinutes() % 10;

		if (currMinute > 0 && currMinute < 9) {

			var currSpin = +document.getElementById('roul-catch-currspin').value;
			var firstBet = +document.getElementById('roul-catch-first-bet').value;

			var fromGM = {};
			numbersToCatch.forEach((number) => {
				fromGM[`Straight up ${number}`] = calculateBet(firstBet, currSpin, factor);
			});

			getPrevNumber().then((lastNumber) => {
				var caughtNumber = '';
				if (numbersToCatch.some((num) => num === lastNumber)) {
					log(`Поздравляю! Число ${lastNumber} выпало!`);

					GM_setValue('hwm_roul_botstatus', 'off');
				} else {
					log(`Выпало число ${lastNumber}. Повышаю ставки`);
					updateBets();

					var delay = 9 * 60 * 1000;
					var nextTime = new Date(+new Date() + delay);
					log(`В следующий раз проверю рулетку в ${nextTime.toLocaleTimeString()}.`);
					setTimeout(() => {
						location.reload();
					}, delay);
				}
			});
		} else {
			setTimeout(() => {
				location.reload();
			}, 60 * 1000);
		}
	}

})();