$SD.on('connected', conn => connected(conn));

function connected (jsn) {
    debugLog('Connected Plugin:', jsn);

    /** subscribe to the willAppear event */
    $SD.on('com.viddie.dice.action.willAppear', jsonObj =>
        diceAction.onWillAppear(jsonObj)
    );
    $SD.on('com.viddie.dice.action.keyDown', jsonObj =>
        diceAction.onKeyDown(jsonObj)
    );
    $SD.on('com.viddie.dice.action.keyUp', jsonObj =>
        diceAction.onKeyUp(jsonObj)
    );
    $SD.on('com.viddie.dice.action.sendToPlugin', jsonObj =>
        diceAction.onSendToPlugin(jsonObj)
    );
}

var results = {
	"1": "images/dice-one-solid.svg",
	"2": "images/dice-two-solid.svg",
	"3": "images/dice-three-solid.svg",
	"4": "images/dice-four-solid.svg",
	"5": "images/dice-five-solid.svg",
	"6": "images/dice-six-solid.svg",
};

var fontMagnitudes = {
	"0": [70, 0],
	"1": [70, 0],
	"2": [70, 4],
	"3": [56, 4],
	"4": [46, 4],
	"5": [37, 3],
	"6": [32, 2],
	"7": [29, 2],
	"other": [25, 2],
};

    	var diceAction = {
			type : "com.viddie.dice.action",
			
			cache: {},
			lastContext: null,
			defaultHandleObj: {
				timer: null,
				canvas: null,
				hadLongPress: false,
				
				settings: {
					lowerLimit: 1,
					upperLimit: 6,
					lastRoll: null,
				},
			},
			
			getHandleObjFromCache: function(context){
				let handleObj = this.cache[context];
				if(handleObj === undefined){
					handleObj = JSON.parse(JSON.stringify(this.defaultHandleObj));
					this.cache[context] = handleObj;
				}
				return handleObj;
			},
			
			onKeyDown : function(jsonObj) {
				var context = jsonObj.context;
				lastContext = context;
				let handleObj = this.getHandleObjFromCache(context);
                
				handleObj.timer = setTimeout(function () {
					handleObj.hadLongPress = true;
					diceAction.updateSettings(context, {lastRoll: null});
					diceAction.setDiceRoll(context, null);
				},500);
			},
			
			onKeyUp : function(jsonObj) {
			    var context = jsonObj.context;
			    var settings = jsonObj.payload.settings;
				lastContext = context;
				let handleObj = this.getHandleObjFromCache(context);
				
                clearTimeout(handleObj.timer);
				
				if(handleObj.hadLongPress){
					handleObj.hadLongPress = false;
					return;
				}
				
				var lastRoll = Math.floor(Math.random()*(handleObj.settings.upperLimit-handleObj.settings.lowerLimit+1)+handleObj.settings.lowerLimit);
				if(!lastRoll && lastRoll !== 0){
					lastRoll = null;
				}
				
				console.log("Rolled a: "+lastRoll);
				
				diceAction.updateSettings(context, {lastRoll: lastRoll});
				this.setDiceRoll(context, lastRoll);
			},
			
			onWillAppear : function(jsonObj) {
				var context = jsonObj.context;
			    var settings = jsonObj.payload.settings;
				lastContext = context;
				let handleObj = this.getHandleObjFromCache(context);
				
				if(settings != null){
					if(settings.hasOwnProperty('lastRoll')){
						handleObj.settings.lastRoll = settings["lastRoll"];
						if(handleObj.settings.lastRoll === undefined || isNaN(handleObj.settings.lastRoll)){
							handleObj.settings.lastRoll = null;
						}
					}
					if(settings.hasOwnProperty('lowerLimit')){
						handleObj.settings.lowerLimit = parseInt(settings["lowerLimit"]) || 1;
					}
					if(settings.hasOwnProperty('upperLimit')){
						handleObj.settings.upperLimit = parseInt(settings["upperLimit"]) || 6;
					}
				}
				
				this.setDiceRoll(context, handleObj.settings.lastRoll);
			},
			
			onSendToPlugin: function(jsonObj){
				var context = jsonObj.context;
				let handleObj = this.getHandleObjFromCache(context);
				
				if (jsonObj.payload.hasOwnProperty('DATAREQUEST')) {
					$SD.api.sendToPropertyInspector(
						jsonObj.context,
						{
							lowerLimit: handleObj.settings.lowerLimit,
							upperLimit: handleObj.settings.upperLimit,
						},
						this.type
					);
				} else {
					if (jsonObj.payload.hasOwnProperty('lowerLimit')) {
						const val = parseInt(jsonObj.payload['lowerLimit']) || 1;
						handleObj.settings.lowerLimit = val;
					}
					if (jsonObj.payload.hasOwnProperty('upperLimit')) {
						const val = parseInt(jsonObj.payload['upperLimit']) || 6;
						handleObj.settings.upperLimit = val;
					}
					
					if(handleObj.settings.lowerLimit > handleObj.settings.upperLimit){
						let temp = handleObj.settings.lowerLimit;
						handleObj.settings.lowerLimit = handleObj.settings.upperLimit;
						handleObj.settings.upperLimit = temp;
					}
					
					diceAction.updateSettings(context, {
						lowerLimit: handleObj.settings.lowerLimit,
						upperLimit: handleObj.settings.upperLimit,
					});
				}
			},
			
			setDiceRoll : function(context, num){
				let handleObj = this.getHandleObjFromCache(context);
				
				if(handleObj.canvas === null){
					handleObj.canvas = document.getElementById("canvas");
				}
				
				let ctx = handleObj.canvas.getContext("2d");
				ctx.filter = "none";
				ctx.fillStyle = "#0A1423";
				ctx.fillRect(0, 0, handleObj.canvas.width, handleObj.canvas.height);
				
				
				if(num === null || (num <= 6 && num >= 1)){
					let resImageURL = "images/pluginIcon.png";
					if(num <= 6 && num >= 1){
						resImageURL = results[""+num];
					}
					
					
					let img = new Image();
					img.onload = () => {
						ctx.filter = "brightness(0) saturate(100%) invert(38%) sepia(62%) saturate(2063%) hue-rotate(209deg) brightness(90%) contrast(95%)";
						
						var imageMargin = 20;
						var imageAspectRatio = img.width / img.height;
						var canvasAspectRatio = handleObj.canvas.width / handleObj.canvas.height;
						var renderableHeight, renderableWidth, xStart, yStart;

						// If image's aspect ratio is less than canvas's we fit on height
						// and place the image centrally along width
						if(imageAspectRatio < canvasAspectRatio) {
							renderableHeight = handleObj.canvas.height;
							renderableWidth = img.width * (renderableHeight / img.height);
							xStart = (handleObj.canvas.width - renderableWidth) / 2;
							yStart = 0;
						}

						// If image's aspect ratio is greater than canvas's we fit on width
						// and place the image centrally along height
						else if(imageAspectRatio > canvasAspectRatio) {
							renderableWidth = handleObj.canvas.width
							renderableHeight = img.height * (renderableWidth / img.width);
							xStart = 0;
							yStart = (handleObj.canvas.height - renderableHeight) / 2;
						}

						// Happy path - keep aspect ratio
						else {
							renderableHeight = handleObj.canvas.height;
							renderableWidth = handleObj.canvas.width;
							xStart = 0;
							yStart = 0;
						}
						ctx.drawImage(img, xStart+imageMargin, yStart+imageMargin, renderableWidth-(2*imageMargin), renderableHeight-(2*imageMargin));
						$SD.api.setImage(context, handleObj.canvas.toDataURL());
					};
					img.src = resImageURL;
					
				} else {
					let magnitude = 1;
					if(num != 0){
						magnitude = Math.floor(Math.log10(Math.abs(num)));
					}
					
					let fontSize = fontMagnitudes[""+magnitude][0];
					if(fontSize === undefined){
						fontSize = fontMagnitudes.other[0];
					}
					
					if(num < 0 && magnitude > 1){
						fontSize -= fontMagnitudes[""+magnitude][1] || 2;
					}
					
					ctx.fillStyle = "#3A6CDF";
					ctx.textAlign = "center";
					ctx.textBaseline = "middle";
					ctx.font = fontSize+"px Arial";
					ctx.fillText(""+num, handleObj.canvas.width/2, handleObj.canvas.height/2);
					$SD.api.setImage(context, handleObj.canvas.toDataURL());
				}
			},
			
			/* Helper function to set settings while keeping all other fields unchanged */
			updateSettings: function(context, settings){
				let handleObj = this.getHandleObjFromCache(context);
				let updatedSettings = handleObj.settings;
				
				for(let field in settings){
					updatedSettings[field] = settings[field];
				}
				
				$SD.api.setSettings(context, updatedSettings);
			},
		};