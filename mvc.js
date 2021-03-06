
function Rates() {
	this.rates = [];
}

function Amount() {
	this.amount = 20;
}

function Altcoins() {
	this.altcoins = ['ETH', 'LTC', 'DASH'];
}

function Model() {
	this.rates = new Rates();
	this.amount = new Amount();
	this.altcoins = new Altcoins();
}

function View(c) {
	this.displayAmount = () => {
		$('#amount').val(c.getAmount());
	}

	// on document ready, display the default amount from the Model
	// also execute the main code in the controller, which makes the get calls to the APIs. Pass the calculateGains function as a callback so that calculateGains is executed from the View. This way the view can update the fields on the screen once the controller is done calculating the gains.
	$(document).ready(function() {
		this.displayAmount();
		c.execute(calculateGains);
	}.bind(this));

	$('#calculateGain').click(function() {
		calculateGains();
	});

	// This is the function to calculate the gains made if you take the best exchange rate. It calls the controller to calculate the gains, and passes the data back to here, to update the view.
	calculateGains = (rates, altcoins) => {
		console.log('in calcgains ', rates);
		if (rates) {
			// if rates were just calculated, they need to be shown on the screen, so pass them into this function
			for (let altcoin of altcoins) {
				for (let rate of rates) {
					// set the values on the webpage
					$('#' + rate.exchange + altcoin).html(rate[altcoin]);

					// if this key exists in this object, then it was found to have the best exchange rate, so highlight it
					if (rate[altcoin + 'best']) {
						$('#' + rate.exchange + altcoin).css('color','orange');
					}
				}
			}
		}

		// get the values for how much is gained if you use the best rate
		gains = c.calculateGains();
		for (let gain of gains) {
			// display the gains amounts
			$('#gained' + gain.altcoin).html(round(gain.gain * $('#amount').val()));
		}
	}
} //end View

function Controller(m) {
	this.getAmount = () => {
		return m.amount.amount;
	}

	this.calculateGains = () => {
		// set empty array to pass back to view
		gains = [];

		// loop through all altcoins in model
		for (let altcoin of m.altcoins.altcoins) {
			// calculate the gain for that altcoin and push a new object with info onto gains array
			const newObj = {
				altcoin: altcoin,
				gain: Math.abs(m.rates.rates[0][altcoin] - m.rates.rates[1][altcoin])
			}
			gains.push(newObj);
		}
		// send array with gains info bace to view to display
		return gains;
	}

	getBittrexRate = (param) => {
		return axios.get('https://bittrex.com/api/v1.1/public/getmarketsummary?market=btc-' + param);
	}

	// Btce exchange rates can be got from one call
	// getBtceRates = () => {
	// 	return axios.get('https://btc-e.com/api/3/ticker/eth_btc-ltc_btc-dsh_btc');
	// }
	getBtceRates = (param) => {
		return axios.get('https://btc-e.com/api/3/ticker/' + param + '_btc')
	}

	this.execute = (callback) => {
		// execute to grab all exchange rates
		Promise.all([
			getBittrexRate('eth'),
			getBittrexRate('ltc'),
			getBittrexRate('dash'),
			getBtceRates('eth'),
			getBtceRates('ltc'),
			getBtceRates('dsh')
		]).then(values => {
			// once we have all the exchange rates in the values function, we want to store them, display them on the screen, and then compare and highlight the best rate.

			// function to round a number to 5 decimal placese. That is how BTCE returns its exchange rate, and Bittrex returns 8 decimal places. So, normalizing on 5
			round = (val) => {
				return Math.round(val * 100000) / 100000;
			}

			reciprocalAndRound = (val) => {
				return round(1 / round(val));
			}

			// once we have the exchange rates, create objects to store the rates from the exchanges from. Once popluated with data, the objects will be pushed onto the m.rates array
			let bittrex = {};
			bittrex.exchange = 'bittrex';

			let btce = {};
			btce.exchange ='btce';

			// for each value, first check for status 200, signifying that the rate was properly returned. For each value, take the reciprocal so we can show how many of the altcoin can be exchanged for each bitcoin.
			if (values[0].status == 200) {
				bittrex.ETH = reciprocalAndRound(values[0].data.result[0].Ask);
			}
			if (values[1].status == 200) {
				bittrex.LTC = reciprocalAndRound(values[1].data.result[0].Ask);
			}
			if (values[2].status == 200) {
				bittrex.DASH = reciprocalAndRound(values[2].data.result[0].Ask);
			}
			if (values[3].status == 200) {
				btce.ETH = reciprocalAndRound(values[3].data.eth_btc.buy);
			}
			if (values[4].status == 200) {
				btce.LTC  = reciprocalAndRound(values[4].data.ltc_btc.buy);
			}
			if (values[5].status == 200) {
				btce.DASH = reciprocalAndRound(values[5].data.dsh_btc.buy);
			}
			m.rates.rates.push(bittrex);
			m.rates.rates.push(btce);

			// check for best rate and highlight. If rates are equal, do not highlight any.
			// first, cycle through each altcoin
			for (let altcoin of m.altcoins.altcoins) {
				// set bestIndex  to store the index of the highest value. Start with it as null. If it gets through all the values and is still null, then all values are equal
				let bestIndex;
				// cycle through the list, starting at second in the list
				for (i = 1; i < m.rates.rates.length; i++) {
					// if there is a current bestIndex, then compare the current item in the list to bestIndex. If this value is higher, then set it as the bestIndex
					if (bestIndex) {
						if (m.rates.rates[i][altcoin] > m.rates.rates[bestIndex][altcoin]) {
							bestIndex = i;
						}
					} else {
						// if there is not currently a best index set, then compare this value to the previous value in the list. If one of the two is higher than the other, then set that value as the bestIndex
						if (m.rates.rates[i][altcoin] > m.rates.rates[i-1][altcoin]) {
							bestIndex = i;
						} else if (m.rates.rates[i-1][altcoin] > m.rates.rates[i][altcoin]) {
							bestIndex = i-1;
						}
					}
				}

				// if there is bestIndex set, then set a key/value pair in the object so it will be highlighted by the View
				if (bestIndex || bestIndex == 0) {
					m.rates.rates[bestIndex][altcoin + 'best'] = true;
				}

			}

			// callback to the view, passing the items from the model that are used to display to the user
			callback(m.rates.rates, m.altcoins.altcoins);
		});
	}
}

var model = new Model();
var controller = new Controller(model);
var view = new View(controller);
