
function Rates() {
	this.rates = {};
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
	calculateGains = () => {
		gains = c.calculateGains();
		for (let gain of gains) {
			console.log(gain);
			$('#gained' + gain.altcoin).html(round(gain.gain * $('#amount').val()));
		}
	}
}

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
				gain: Math.abs(m.rates.btce[altcoin] - m.rates.bittrex[altcoin])
			}
			gains.push(newObj);
		}
		console.log('gainArray: ', gains);
		// send array with gains info bace to view to display
		return gains;
	}

	getBittrexRate = (param) => {
		return axios.get('https://bittrex.com/api/v1.1/public/getmarketsummary?market=btc-' + param);
	}

	// Btce exchange rates can be got from one call
	getBtceRates = () => {
		return axios.get('https://btc-e.com/api/3/ticker/eth_btc-ltc_btc-dsh_btc');
	}

	this.execute = (callback) => {
		// execute to grab all exchange rates
		Promise.all([
			getBittrexRate('eth'),
			getBittrexRate('ltc'),
			getBittrexRate('dash'),
			getBtceRates()
		]).then(values => {
			// once we have all the exchange rates in the values function, we want to store them, display them on the screen, and then compare and highlight the best rate.

			// function to round a number to 5 decimal placese. That is how BTCE returns its exchange rate, and Bittrex returns 8 decimal places. So, normalizing on 5
			round = (val) => {
				return Math.round(val * 100000) / 100000;
			}

			reciprocalAndRound = (val) => {
				return round(1 / round(val));
			}

			// once we have the exchange rates, create a sub object to store the bittrex rates in
			m.rates['bittrex']={};

			// for each value, first check for status 200, signifying that the rate was properly returned. For each value, take the reciprocal so we can show how many of the altcoin can be exchanged for each bitcoin.
			if (values[0].status == 200) {
				m.rates.bittrex.ETH = reciprocalAndRound(values[0].data.result[0].Ask);
			}
			if (values[1].status == 200) {
				m.rates.bittrex.LTC = reciprocalAndRound(values[1].data.result[0].Ask);
			}
			if (values[2].status == 200) {
				m.rates.bittrex.DASH = reciprocalAndRound(values[2].data.result[0].Ask);
			}
			if (values[3].status == 200) {
				// if the btce call came back successfully, create a sub object to store the btce exchange rates in. Remember, we were able to do the btce calls with one call, and the api returned all three values we needed.
				m.rates['btce']={};
				m.rates.btce.ETH = reciprocalAndRound(values[3].data.eth_btc.buy);
				m.rates.btce.LTC  = reciprocalAndRound(values[3].data.ltc_btc.buy);
				m.rates.btce.DASH = reciprocalAndRound(values[3].data.dsh_btc.buy);
			}

			// cycle through each of the altcoins being compared
			for (let altcoin of ['ETH', 'LTC', 'DASH']) {
				// set the values on the webpage
				$('#bittrex' + altcoin).html(m.rates.bittrex[altcoin]);
				$('#btce' + altcoin).html(m.rates.btce[altcoin]);

				// check for best rate and highlight. If rates are equal, do not highlight either
				if (m.rates.btce[altcoin] > m.rates.bittrex[altcoin]) {
					$('#btce' + altcoin).css('color','orange');
				} else if (m.rates.btce[altcoin] < m.rates.bittrex[altcoin]) {
					$('#bittrex' + altcoin).css('color','orange');
				}
			}

			// need a callback to call calculateGains from View
			callback();
		});
	}
}

var model = new Model();
var controller = new Controller(model);
var view = new View(controller);
