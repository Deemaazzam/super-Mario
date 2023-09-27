const handlers={
    "brick":[
        function handleX({entity, match}) {

            if (entity.vel.x > 0) {
                if (entity.bounds.right > match.x1) {
                    entity.obstruct('right', match);
                }
            } else if (entity.vel.x < 0) {
                if (entity.bounds.left < match.x2) {
                    entity.obstruct('left', match);
                }
            }
        },
        function handleY({entity, match, resolver, gameContext, level}) {
            if (entity.vel.y > 0) {
                if (entity.bounds.bottom > match.y1) {
                    entity.obstruct('bottom', match);
                }
            } else if (entity.vel.y < 0) {
                if (entity.traits.has(Player)) {
                    const grid = resolver.matrix;
                    grid.delete(match.indexX, match.indexY);
        
                    const goomba = gameContext.entityFactory.goomba();
                    goomba.vel.set(50, -400);
                    goomba.pos.set(entity.pos.x, match.y1);
                    level.entities.add(goomba);
                }
        
                if (entity.bounds.top < match.y2) {
                    entity.obstruct('top', match);
                }
            }
        }
    ],
    "ground":[
        function handleX({entity, match}) {
            if (entity.vel.x > 0) {
                if (entity.bounds.right > match.x1) {
                    entity.obstruct('right', match);
                }
            } else if (entity.vel.x < 0) {
                if (entity.bounds.left < match.x2) {
                    entity.obstruct('left', match);
                }
            }
        },
        function handleY({entity, match}) {
            if (entity.vel.y > 0) {
                if (entity.bounds.bottom > match.y1) {
                    entity.obstruct('bottom', match);
                }
            } else if (entity.vel.y < 0) {
                if (entity.bounds.top < match.y2) {
                    entity.obstruct('top', match);
                }
            }
        }
    ],
    "coin":[
        
        function handle({entity,match,resolver}){
           
                if (entity.traits.has(Player)) {
                    const grid = resolver.matrix;
                    grid.delete(match.indexX, match.indexY);
                    entity.traits.get(Player).addCoins(1);
                }
            
        },
        function handle({entity,match,resolver}){
            if (entity.traits.has(Player)) {
                const grid = resolver.matrix;
                grid.delete(match.indexX, match.indexY);
                entity.traits.get(Player).addCoins(1);
            }
        }
    ]
}
const playAgainButton=document.getElementById('buttonRestart');
//loaders these are synchronous  functions that return promises
function loadImage(url) {
    return new Promise(resolve => {
        const image = new Image();
        image.addEventListener('load', () => {
            resolve(image);
        });
        image.src = url;
    });
};
function loadJSON(url) {
    return fetch(url)
    .then(r => r.json());
};
function loadSpriteSheet(name) {
    return loadJSON(`./sprites/${name}.json`)
    .then(sheetSpec => Promise.all([
        sheetSpec,
        loadImage(sheetSpec.imageURL),
    ]))
    .then(([sheetSpec, image]) => {
        const sprites = new SpriteSheet(
            image,
            sheetSpec.tileW,
            sheetSpec.tileH);

        if (sheetSpec.tiles) {
            sheetSpec.tiles.forEach(tileSpec => {
                sprites.defineTile(
                    tileSpec.name,
                    tileSpec.index[0],
                    tileSpec.index[1]);
            });
        }

        if (sheetSpec.frames) {
            sheetSpec.frames.forEach(frameSpec => {
                sprites.define(frameSpec.name, ...frameSpec.rect);
            });
        }

        if (sheetSpec.animations) {
            sheetSpec.animations.forEach(animSpec => {
                const animation = createAnim(animSpec.frames, animSpec.frameLen);
                sprites.defineAnim(animSpec.name, animation);
            });
        }

        return sprites;
    });
}
function loadMario(audioContext) {
    return Promise.all([
        loadSpriteSheet('mario'),
        loadAudioBoard('mario', audioContext),
    ])
    .then(([sprite, audio]) => {
        return createMarioFactory(sprite, audio);
    });
}
 function loadCannon(audioContext) {
    return loadAudioBoard('cannon', audioContext)
    .then(audio => {
        return createCannonFactory(audio);
    });
}
function loadGoomba() {
    return loadSpriteSheet('goomba')
    .then(createGoombaFactory);
}
function loadBullet() {
    return loadSpriteSheet('bullet')
    .then(createBulletFactory);
}

function loadKoopa() {
    return loadSpriteSheet('koopa')
    .then(createKoopaFactory);
}
function loadEntities(audioContext) {
    const entityFactories = {};

    function addAs(name) {
        return factory => entityFactories[name] = factory;
    }


    return Promise.all([
        loadMario(audioContext).then(addAs('mario')),
        loadGoomba(audioContext).then(addAs('goomba')),
        loadKoopa(audioContext).then(addAs('koopa')),
        loadBullet(audioContext).then(addAs('bullet')),
        loadCannon(audioContext,entityFactories).then(addAs('cannon'))
    ])
    .then(() => entityFactories);
}
function loadFont() {
    return loadImage('./img/font.png')
    .then(image => {
        const fontSprite = new SpriteSheet(image);

        const size = 8;
        const rowLen = image.width;
        for (let [index, char] of [...CHARS].entries()) {
            const x = index * size % rowLen;
            const y = Math.floor(index * size / rowLen) * size;
            fontSprite.define(char, x, y, size, size);
        }

        return new Font(fontSprite, size);
    });
}
function loadAudioBoard(name, audioContext) {
    const loadAudio = createAudioLoader(audioContext);
    return loadJSON(`./sounds/${name}.json`)
        .then(audioSheet => {
            const audioBoard = new AudioBoard();
            const fx = audioSheet.fx;
            return Promise.all(Object.keys(fx).map(name => {
                return loadAudio(fx[name].url)
                    .then(buffer => {
                        audioBoard.addAudio(name, buffer);
                    });
            }))
            .then(() => {
                return audioBoard;
            });
        });
}
function loadMusicSheet(name) {
    return loadJSON(`./music/${name}.json`)
        .then(musicSheet => {
            const musicPlayer = new MusicPlayer();
            for (const [name, track] of Object.entries(musicSheet)) {
                musicPlayer.addTrack(name, track.url);
            }
            return musicPlayer;
        });
}
function loadPattern(name){
    return loadJSON(`./sprites/patterns/${name}.json`)
}
function setUpCollision(levelSpec,level){
    const mergedTiles = levelSpec.layers.reduce((mergedTiles, layerSpec) => {
        return mergedTiles.concat(layerSpec.tiles);
    }, []);
    const collisionGrid = createCollisionGrid(mergedTiles, levelSpec.patterns);
    level.setCollisionGrid(collisionGrid);
}
function setupBackgrounds(levelSpec, level, backgroundSprites, patterns) {
    levelSpec.layers.forEach(layer => {
        const grid = createGrid(layer.tiles, patterns);
        const backgroundLayer = createBackgroundLayer(level, grid, backgroundSprites);
        level.comp.layers.push(backgroundLayer);
        level.tileCollider.addGrid(grid);
    });
}
function setupEntities(levelSpec, level, entityFactory) {
    levelSpec.entities.forEach(({name, positions}) => {
        positions.forEach((position)=>{
            const [x,y]=position;
            const createEntity = entityFactory[name];
            const entity = createEntity();
            entity.pos.set(x, y);
            level.entities.add(entity);
        }) 
    });

    const spriteLayer = createSpriteLayer(level.entities);
    level.comp.layers.push(spriteLayer);
}
function displayGameOver(font,level){
    return function drawGameOver(context){
        if(level.win)
                font.print('Game Over', context, 92, font.size*13);
    }
}
function setupBehavior(level) {
    const timer = createTimer();
    level.entities.add(timer);

    level.events.listen(LevelTimer.EVENT_TIMER_OK, () => {
        level.music.playTheme();
    });
    level.events.listen(LevelTimer.EVENT_TIMER_HURRY, () => {
        level.music.playHurryTheme();
    });
}
function setupTriggers(levelSpec, level) {
    if (!levelSpec.triggers) {
        return;
    }

    for (const triggerSpec of levelSpec.triggers) {
        const trigger = new Trigger();

        trigger.conditions.push((entity, touches, gc, level) => {
            level.events.emit(Level.EVENT_TRIGGER, triggerSpec, entity, touches);
        });

        const entity = new Entity();
        entity.addTrait(trigger);
        entity.size.set(64, 64);
        entity.pos.set(triggerSpec.pos[0], triggerSpec.pos[1]);
        level.entities.add(entity);
    }
}
function createLevelLoader(entityFactory) {
    return function loadLevel(name) {
        return loadJSON(`./levels/${name}.json`)
        .then(levelSpec => Promise.all([
            levelSpec,
            loadSpriteSheet(levelSpec.spriteSheet),
            loadMusicSheet(levelSpec.musicSheet),
            loadPattern(levelSpec.patternSheet),
        ]))
        .then(([levelSpec, backgroundSprites, musicPlayer, patterns]) => {
            const level = new Level();
            level.name = name;
            level.music.setPlayer(musicPlayer);

            setupBackgrounds(levelSpec, level, backgroundSprites, patterns);
            setupEntities(levelSpec, level, entityFactory);
            setupTriggers(levelSpec, level);
            setupBehavior(level);

            return level;
        });
    }
}
function loadBackgroundSprites(){
  return  loadImage('./img/tileset.png').then(image=>{
        const sprites=new SpriteSheet(image,16,16);
        sprites.defineTile('ground',0,0);
        sprites.defineTile('sky',3,23);
    return sprites;})
};
//functions
function drawBackground(background,context,sprites){
    background.ranges.forEach(([x1,x2,y1,y2])=>{
        for(let x=x1;x<x2;x++)
           for(let y=y1;y<y2;y++)
            sprites.drawTile(background.tile,context,x,y);
    });
};
function createBackgroundLayer(level, tiles, sprites) {
    const resolver = new TileResolver(tiles);

    const buffer = document.createElement('canvas');
    buffer.width = 256 + 16;
    buffer.height = 240;

    const context = buffer.getContext('2d');

    function redraw(startIndex, endIndex)  {
        context.clearRect(0, 0, buffer.width, buffer.height);

        for (let x = startIndex; x <= endIndex; ++x) {
            const col = tiles.grid[x];
            if (col) {
                col.forEach((tile, y) => {
                    if (sprites.animations.has(tile.name)) {
                        sprites.drawAnim(tile.name, context, x - startIndex, y, level.totalTime);
                    } else {
                        sprites.drawTile(tile.name, context, x - startIndex, y);
                    }
                });
            }
        }
    }

    return function drawBackgroundLayer(context, camera) {
        const drawWidth = resolver.toIndex(camera.size.x);
        const drawFrom = resolver.toIndex(camera.pos.x);
        const drawTo = drawFrom + drawWidth;
        redraw(drawFrom, drawTo);

        context.drawImage(buffer,
            Math.floor(-camera.pos.x % 16),
            Math.floor(-camera.pos.y));
    };
}
function createSpriteLayer(entities, width = 64, height = 64) {
    const spriteBuffer = document.createElement('canvas');
    spriteBuffer.width = width;
    spriteBuffer.height = height;
    const spriteBufferContext = spriteBuffer.getContext('2d');

    return function drawSpriteLayer(context, camera) {
        entities.forEach(entity => {
            spriteBufferContext.clearRect(0, 0, width, height);

            entity.draw(spriteBufferContext);

            context.drawImage(
                spriteBuffer,
                Math.floor(entity.pos.x - camera.pos.x),
                Math.floor(entity.pos.y - camera.pos.y));
        });
    };
}
function createTextLayer(font, text) {
    const size = font.size;
    return function drawText(context) {
        const textW = text.length;
        const screenW = Math.floor(context.canvas.width / size);
        const screenH = Math.floor(context.canvas.height / size);
        const x = screenW / 2 - textW / 2;
        const y = screenH / 2;
        font.print(text, context, x * size, y * size);
    };
}
function createTileCandidateLayer(tileResolver) {
    const resolvedTiles = [];

    const tileSize = tileResolver.tileSize;

    const getByIndexOriginal = tileResolver.getByIndex;
    tileResolver.getByIndex = function getByIndexFake(x, y) {
        resolvedTiles.push({x, y});
        return getByIndexOriginal.call(tileResolver, x, y);
    }

    return function drawTileCandidates(context, camera) {
        context.strokeStyle = 'blue';
        resolvedTiles.forEach(({x, y}) => {
            context.beginPath();
            context.rect(
                x * tileSize - camera.pos.x,
                y * tileSize - camera.pos.y,
                tileSize, tileSize);
            context.stroke();
        });

        resolvedTiles.length = 0;
    }
}
function createEntityLayer(entities) {
    return function drawBoundingBox(context, camera) {
        context.strokeStyle = 'red';
        entities.forEach(entity => {
            context.beginPath();
            context.rect(
                entity.bounds.left - camera.pos.x,
                entity.bounds.top - camera.pos.y,
                entity.size.x,
                entity.size.y);
            context.stroke();
        });
    };
}
function createCollisionLayer(level) {

    const drawTileCandidates = level.tileCollider.resolvers.map(createTileCandidateLayer);
    const drawBoundingBoxes = createEntityLayer(level.entities);

    return function drawCollision(context, camera) {
        drawTileCandidates.forEach(draw => draw(context, camera));
        drawBoundingBoxes(context, camera);
    };
}
function createColorLayer(color) {
    return function drawColor(context) {
        context.fillStyle = color;
        context.fillRect(0, 0, context.canvas.width, context.canvas.height);
    };
}
function createCameraLayer(cameraToDraw) {
    return function drawCameraRect(context, fromCamera) {
        context.strokeStyle = 'purple';
        context.beginPath();
        context.rect(
            cameraToDraw.pos.x - fromCamera.pos.x,
            cameraToDraw.pos.y - fromCamera.pos.y,
            cameraToDraw.size.x,
            cameraToDraw.size.y);
        context.stroke();
    };
}
function getPlayerTrait(entities) {
    for (const entity of findPlayers(entities)) {
        return entity.traits.get(Player);
    }
}

function getTimerTrait(entities) {
    for (const entity of entities) {
        if (entity.traits.has(LevelTimer)) {
            return entity.traits.get(LevelTimer);
        }
    }
}
const CHARS=' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';
function createDashboardLayer(font, level) {
    const LINE1 = font.size;
    const LINE2 = font.size * 2;

    const timerTrait = getTimerTrait(level.entities);

    return function drawDashboard(context) {
        const playerTrait = getPlayerTrait(level.entities);
        const player=getPlayer(level.entities)
        if(player==undefined){
            return;
        }
        font.print('MARIO', context, 16, LINE1);
        font.print(playerTrait.score.toString().padStart(6, '0'), context, 16, LINE2);

        font.print('@x' + playerTrait.coins.toString().padStart(2, '0'), context, 96, LINE2);

        font.print('WORLD', context, 152, LINE1);
        font.print(level.name, context, 160, LINE2);

        font.print('TIME', context, 208, LINE1);
        font.print(timerTrait.currentTime.toFixed().toString().padStart(3, '0'), context, 216, LINE2);
    };
}
function getPlayer(entities) {
    for (const entity of findPlayers(entities)) {
        return entity;
    }
}
function createPlayerProgressLayer(font, level) {
    const size = font.size;

    const spriteBuffer = document.createElement('canvas');
    spriteBuffer.width = 32;
    spriteBuffer.height = 32;
    const spriteBufferContext = spriteBuffer.getContext('2d');

    return function drawPlayerProgress(context) {
        const entity = getPlayer(level.entities);
        const player = entity.traits.get(Player);
        font.print('WORLD ' + level.name, context, size * 12, size * 12);

        font.print('x ' + player.lives.toString().padStart(3, ' '),
            context, size * 16, size * 16);

        spriteBufferContext.clearRect(0, 0,
            spriteBuffer.width, spriteBuffer.height);
        entity.draw(spriteBufferContext);
        context.drawImage(spriteBuffer, size * 12, size * 15);
    };
}
function createAnim(frames, frameLen) {
    return function resolveFrame(distance) {
        const frameIndex = Math.floor(distance / frameLen) % frames.length;
        const frameName = frames[frameIndex];
        return frameName;
    };
}
function createTimer() {
    const timer = new Entity();
    timer.addTrait(new LevelTimer());
    return timer;
}
function createTrigger() {
    const entity = new Entity();
    entity.addTrait(new Trigger());
    return entity;
}
function makePlayer(entity, name) {
    const player = new Player();
    player.name = "MARIO";
    entity.addTrait(player);
}

function createGrid(tiles, patterns) {
    const grid = new Matrix();

    for (const {tile, x, y} of expandTiles(tiles, patterns)) {
        grid.set(x, y, tile);
    }

    return grid;
}
//heretht context is an audio context
function createAudioLoader(context) {
    return function loadAudio(url) {
        return fetch(url)
           .then(response => {
                return response.arrayBuffer();
            })
            .then(arrayBuffer => {
                return context.decodeAudioData(arrayBuffer);
            });
    }
}
function createMarioFactory(sprite, audio) {
    const runAnim = sprite.animations.get('run');

    function routeFrame(mario) {
        if (mario.traits.get(Jump).falling) {
            return 'jump';
        }

        if (mario.traits.get(Go).distance > 0) {
            if ((mario.vel.x > 0 && mario.traits.get(Go).dir < 0) || (mario.vel.x < 0 && mario.traits.get(Go).dir > 0)) {
                return 'break';
            }

            return runAnim(mario.traits.get(Go).distance);
        }

        return 'idle';
    }

    function setTurboState(turboOn) {
        this.traits.get(Go).dragFactor = turboOn ? 1/1000 : 1/5000;
    }

    function drawMario(context) {
        sprite.draw(routeFrame(this), context, 0, 0, this.traits.get(Go).heading < 0);
    }

    return function createMario() {
        const mario = new Entity();
        mario.audio = audio;
        mario.size.set(14, 16);

        mario.addTrait(new Physics());
        mario.addTrait(new Solid());
        mario.addTrait(new Go());
        mario.addTrait(new Jump());
        mario.addTrait(new Killable());
        mario.addTrait(new Stomper());

    
        mario.traits.get(Killable).removeAfter = 0;

        mario.turbo = setTurboState;
        mario.draw = drawMario;

        mario.turbo(false);

        return mario;
    }
}
const HOLD_FIRE_THRESHOLD=30;
function* findPlayers(entities) {
    for (const entity of entities) {
        if (entity.traits.has(Player)) {
            yield entity;
        }
    }
}
function createCannonFactory(audio) {

    function emitBullet(cannon, gameContext, level) {
        let dir = 1;
        for (const player of findPlayers(level.entities)) {
            if (player.pos.x > cannon.pos.x - HOLD_FIRE_THRESHOLD
            && player.pos.x < cannon.pos.x + HOLD_FIRE_THRESHOLD) {
                return;
            }

            if (player.pos.x < cannon.pos.x) {
                dir = -1;
            }
        }

        const bullet = gameContext.entityFactory.bullet();

        bullet.pos.copy(cannon.pos);
        bullet.vel.set(80 * dir, 0);

        cannon.sounds.add('shoot');
        level.entities.add(bullet);
    }

    return function createCannon() {
        const cannon = new Entity();
        cannon.audio = audio;

        const emitter = new Emitter();
        emitter.interval = 4;
        emitter.emitters.push(emitBullet);
        cannon.addTrait(emitter);
        return cannon;
    }
}
function createGoombaFactory(sprite) {
    const walkAnim = sprite.animations.get('walk');

    function routeAnim(goomba) {
        if (goomba.traits.get(Killable).dead) {
            return 'flat';
        }

        return walkAnim(goomba.lifetime);
    }

    function drawGoomba(context) {
        sprite.draw(routeAnim(this), context, 0, 0);
    }

    return function createGoomba() {
        const goomba = new Entity();
        goomba.size.set(16, 16);

        goomba.addTrait(new Physics());
        goomba.addTrait(new Solid());
        goomba.addTrait(new PendulumMove());
        goomba.addTrait(new GoombaBehavior());
        goomba.addTrait(new Killable());

        goomba.draw = drawGoomba;

        return goomba;
    };
}
function createBulletFactory(sprite) {
    function drawBullet(context) {
        sprite.draw('bullet', context, 0, 0, this.vel.x < 0);
    }

    return function createBullet() {
        const bullet = new Entity();
        bullet.size.set(16, 14);

        bullet.addTrait(new Velocity());
        bullet.addTrait(new BulletBehavior());
        bullet.addTrait(new Killable());

        bullet.draw = drawBullet;

        return bullet;
    };
}
function createKoopaFactory(sprite) {
    const walkAnim = sprite.animations.get('walk');
    const wakeAnim = sprite.animations.get('wake');

    function routeAnim(koopa) {
        if (koopa.traits.get(KoopaBehavior).state === STATE_HIDING) {
            if (koopa.traits.get(KoopaBehavior).hideTime > 3) {
                return wakeAnim(koopa.traits.get(KoopaBehavior).hideTime);
            }
            return 'hiding';
        }

        if (koopa.traits.get(KoopaBehavior).state === STATE_PANIC) {
            return 'hiding';
        }

        return walkAnim(koopa.lifetime);
    }

    function drawKoopa(context) {
        sprite.draw(routeAnim(this), context, 0, 0, this.vel.x < 0);
    }

    return function createKoopa() {
        const koopa = new Entity();
        koopa.size.set(16, 16);
        koopa.offset.y = 8;

        koopa.addTrait(new Physics());
        koopa.addTrait(new Solid());
        koopa.addTrait(new PendulumMove());
        koopa.addTrait(new Killable());
        koopa.addTrait(new KoopaBehavior());

        koopa.draw = drawKoopa;

        return koopa;
    };
}

function* expandSpan(xStart, xLen, yStart, yLen) {
    const xEnd = xStart + xLen;
    const yEnd = yStart + yLen;
    for (let x = xStart; x < xEnd; ++x) {
        for (let y = yStart; y < yEnd; ++y) {
            yield {x, y};
        }
    }
}
function expandRange(range) {
    if (range.length === 4) {
        const [xStart, xLen, yStart, yLen] = range;
        return expandSpan(xStart, xLen, yStart, yLen);

    } else if (range.length === 3) {
        const [xStart, xLen, yStart] = range;
        return expandSpan(xStart, xLen, yStart, 1);

    } else if (range.length === 2) {
        const [xStart, yStart] = range;
        return expandSpan(xStart, 1, yStart, 1);
    }
}

function* expandRanges(ranges) {
    for (const range of ranges) {
        yield* expandRange(range);
    }
}

function* expandTiles(tiles, patterns) {
    function* walkTiles(tiles, offsetX, offsetY) {
        for (const tile of tiles) {
            for (const {x, y} of expandRanges(tile.ranges)) {
                const derivedX = x + offsetX;
                const derivedY = y + offsetY;

                if (tile.pattern) {
                    const tiles = patterns[tile.pattern].tiles;
                    yield* walkTiles(tiles, derivedX, derivedY);
                } else {
                    yield {
                        tile,
                        x: derivedX,
                        y: derivedY,
                    };
                }
            }
        }
    }

    yield* walkTiles(tiles, 0, 0);
}
function setupKeyboard(window) {
    const input = new KeyBoard();
    const router = new InputRouter();

    input.listenTo(window);

    input.addMapping('KeyP', keyState => {
        if (keyState) {
            router.route(entity => entity.traits.get(Jump).start());
        } else {
            router.route(entity => entity.traits.get(Jump).cancel());
        }
    });
    input.addMapping('Space', keyState => {
        if (keyState) {
            router.route(entity => entity.traits.get(Jump).start());
        } else {
            router.route(entity => entity.traits.get(Jump).cancel());
        }
    });

    input.addMapping('KeyO', keyState => {
        router.route(entity => entity.turbo(keyState));
    });

    input.addMapping('KeyD', keyState => {
        router.route(entity => entity.traits.get(Go).dir += keyState ? 1 : -1);
    });
    input.addMapping('ArrowRight', keyState => {
        router.route(entity => entity.traits.get(Go).dir += keyState ? 1 : -1);
    });

    input.addMapping('KeyA', keyState => {
        router.route(entity => entity.traits.get(Go).dir += keyState ? -1 : 1);
    });
    input.addMapping('ArrowLeft', keyState => {
        router.route(entity => entity.traits.get(Go).dir += keyState ? -1 : 1);
    });

    return router;
}
function setupMouseControl(canvas, entity, camera) {
    let lastEvent;

    ['mousedown', 'mousemove'].forEach(eventName => {
        canvas.addEventListener(eventName, event => {
            if (event.buttons === 1) {
                entity.vel.set(0, 0);
                entity.pos.set(
                    event.offsetX + camera.pos.x,
                    event.offsetY + camera.pos.y);
            } else if (event.buttons === 2
                && lastEvent && lastEvent.buttons === 2
                && lastEvent.type === 'mousemove') {
                camera.pos.x -= event.offsetX - lastEvent.offsetX;
            }
            lastEvent = event;
        });
    });

    canvas.addEventListener('contextmenu', event => {
        event.preventDefault();
    });
}
function createPlayerEnv(playerEntity) {
    const playerEnv = new Entity();
    const playerControl = new PlayerController();
    playerControl.checkpoint.set(64, 64);
    playerControl.setPlayer(playerEntity);
    playerEnv.addTrait(playerControl);
    return playerEnv;
}

//classes
class SpriteSheet {
    constructor(image, width, height) {
        this.image = image;
        this.width = width;
        this.height = height;
        this.tiles = new Map();
        this.animations = new Map();
    }

    defineAnim(name, animation) {
        this.animations.set(name, animation);
    }

    define(name, x, y, width, height) {
        const buffers = [false, true].map(flip => {
            const buffer = document.createElement('canvas');
            buffer.width = width;
            buffer.height = height;

            const context = buffer.getContext('2d');

            if (flip) {
                context.scale(-1, 1);
                context.translate(-width, 0);
            }

            context.drawImage(
                this.image,
                x,
                y,
                width,
                height,
                0,
                0,
                width,
                height);

            return buffer;
        });

        this.tiles.set(name, buffers);
    }

    defineTile(name, x, y) {
        this.define(name, x * this.width, y * this.height, this.width, this.height);
    }

    draw(name, context, x, y, flip = false) {
        const buffer = this.tiles.get(name)[flip ? 1 : 0];
        context.drawImage(buffer, x, y);
    }

    drawAnim(name, context, x, y, distance) {
        const animation = this.animations.get(name);
        this.drawTile(animation(distance), context, x, y);
    }

    drawTile(name, context, x, y) {
        this.draw(name, context, x * this.width, y * this.height);
    }
}
class Compositor {
    constructor() {
        this.layers = [];
    }

    draw(context, camera) {
        this.layers.forEach(layer => {
            layer(context, camera);
        });
    }
}
class Vec2 {
    constructor(x, y) {
        this.set(x, y);
    }
    copy(vec2){
        this.x=vec2.x;
        this.y=vec2.y;
    }
    set(x, y) {
        this.x = x;
        this.y = y;
    }
}
class BoundingBox {
    constructor(pos, size, offset) {
        this.pos = pos;
        this.size = size;
        this.offset = offset;
    }

    overlaps(box) {
        return this.bottom > box.top
            && this.top < box.bottom
            && this.left < box.right
            && this.right > box.left;
    }

    get bottom() {
        return this.pos.y + this.size.y + this.offset.y;
    }

    set bottom(y) {
        this.pos.y = y - (this.size.y + this.offset.y);
    }

    get top() {
        return this.pos.y + this.offset.y;
    }

    set top(y) {
        this.pos.y = y - this.offset.y;
    }

    get left() {
        return this.pos.x + this.offset.x;
    }

    set left(x) {
        this.pos.x = x - this.offset.x;
    }

    get right() {
        return this.pos.x + this.size.x + this.offset.x;
    }

    set right(x) {
        this.pos.x = x - (this.size.x + this.offset.x);
    }
}
class Entity {
    constructor() {
        this.audio = new AudioBoard();
        this.events = new EventBuffer();
        this.sounds = new Set();

        this.events = new EventBuffer();

        this.pos = new Vec2(0, 0);
        this.vel = new Vec2(0, 0);
        this.size = new Vec2(0, 0);
        this.offset = new Vec2(0, 0);
        this.bounds = new BoundingBox(this.pos, this.size, this.offset);
        this.lifetime = 0;

        this.traits = new Map();
    }

    addTrait(trait) {
        this.traits.set(trait.constructor, trait);
    }

    collides(candidate) {
        this.traits.forEach(trait => {
            trait.collides(this, candidate);
        });
    }

    obstruct(side, match) {
        this.traits.forEach(trait => {
            trait.obstruct(this, side, match);
        });
    }

    draw() {

    }

    finalize() {
        this.events.emit(Trait.EVENT_TASK, this);

        this.traits.forEach(trait => {
            trait.finalize(this);
        });

        this.events.clear();
    }

    playSounds(audioBoard, audioContext) {
        this.sounds.forEach(name => {
            audioBoard.playAudio(name, audioContext);
        });

        this.sounds.clear();
    }

    update(gameContext, level) {
        this.traits.forEach(trait => {
            trait.update(this, gameContext, level);
        });

        this.playSounds(this.audio, gameContext.audioContext);

        this.lifetime += gameContext.deltaTime;
    }
}
class Timer {
    constructor(deltaTime = 1/60) {
        let accumulatedTime = 0;
        let lastTime = null;
        this.animation=null;
        this.updateProxy = (time) => {
            if (lastTime) {
                accumulatedTime += (time - lastTime) / 1000;

                if (accumulatedTime > 1) {
                    accumulatedTime = 1;
                }

                while (accumulatedTime > deltaTime) {
                    this.update(deltaTime);
                    accumulatedTime -= deltaTime;
                }
            }

            lastTime = time;

            this.enqueue();
        }
    }

    enqueue() {
        this.animation=requestAnimationFrame(this.updateProxy);
    }

    start() {
        this.enqueue();
    }
    cancel(){
        cancelAnimationFrame(this.animation)
    }
}
class KeyBoard {
    constructor() {
        // Holds the current state of a given key
        this.keyStates = new Map();

        // Holds the callback functions for a key code
        this.keyMap = new Map();
    }

    addMapping(code, callback) {
        this.keyMap.set(code, callback);
    }

    handleEvent(event) {
        const PRESSED=1;
        const RELEASED=0;
        const {code} = event;

        if (!this.keyMap.has(code)) {
            // Did not have key mapped.
            return;
        }

        event.preventDefault();

        const keyState = event.type === 'keydown' ? PRESSED : RELEASED;

        if (this.keyStates.get(code) === keyState) {
            return;
        }

        this.keyStates.set(code, keyState);

        this.keyMap.get(code)(keyState);
    }

    listenTo(window) {
        ['keydown', 'keyup'].forEach(eventName => {
            window.addEventListener(eventName, event => {
                this.handleEvent(event);
            });
        });
    }
}
class AudioBoard {
    constructor() {
        this.buffers = new Map();
    }

    addAudio(name, buffer) {
        this.buffers.set(name, buffer);
    }

    playAudio(name, context) {
        const source = context.createBufferSource();
        source.connect(context.destination);
        source.buffer = this.buffers.get(name);
        source.start(0);
    }
}
class EventBuffer {
    constructor() {
        this.events = [];
    }

    emit(name, ...args) {
        const event = {name, args};
        this.events.push(event);
    }

    process(name, callback) {
        this.events.forEach(event => {
            if (event.name === name) {
                callback(...event.args);
            }
        });
    }

    clear() {
        this.events.length = 0;
    }
}
class EventEmitter {
    constructor() {
        this.listeners = [];
    }

    listen(name, callback) {
        const listener = {name, callback};
        this.listeners.push(listener);
    }

    emit(name, ...args) {
        this.listeners.forEach(listener => {
            if (listener.name === name) {
                listener.callback(...args);
            }
        });
    }
}
class Trait {
    static EVENT_TASK = Symbol('task');

    constructor() {
        this.listeners = [];
    }

    listen(name, callback, count = Infinity) {
        const listener = {name, callback, count};
        this.listeners.push(listener);
    }

    finalize(entity) {
        this.listeners = this.listeners.filter(listener => {
            entity.events.process(listener.name, listener.callback);
            return --listener.count;
        });
    }

    queue(task) {
        this.listen(Trait.EVENT_TASK, task, 1);
    }

    collides(us, them) {

    }

    obstruct() {

    }

    update() {

    }
}

class Jump extends Trait {
    constructor() {
        super();

        this.ready = 0;
        this.duration = 0.3;
        this.engageTime = 0;
        this.requestTime = 0;
        this.gracePeriod = 0.1;
        this.speedBoost = 0.3;
        this.velocity = 200;
    }

    get falling() {
        return this.ready < 0;
    }

    start() {
        this.requestTime = this.gracePeriod;
    }

    cancel() {
        this.engageTime = 0;
        this.requestTime = 0;
    }

    obstruct(entity, side) {
        if (side === 'bottom') {
            this.ready = 1;
        } else if (side === 'top') {
            this.cancel();
        }
    }

    update(entity, {deltaTime}, level) {
        if (this.requestTime > 0) {
            if (this.ready > 0) {
                entity.sounds.add('jump');
                this.engageTime = this.duration;
                this.requestTime = 0;
            }

            this.requestTime -= deltaTime;
        }

        if (this.engageTime > 0) {
            entity.vel.y = -(this.velocity + Math.abs(entity.vel.x) * this.speedBoost);
            this.engageTime -= deltaTime;
        }

        this.ready--;
    }
}
class Go extends Trait {
    constructor() {
        super();

        this.dir = 0;
        this.acceleration = 400;
        this.deceleration = 300;
        this.dragFactor = 1/5000;

        this.distance = 0;
        this.heading = 1;
    }

    update(entity, {deltaTime}) {
        const absX = Math.abs(entity.vel.x);

        if (this.dir !== 0) {
            entity.vel.x += this.acceleration * deltaTime * this.dir;

            if (entity.jump) {
                if (entity.jump.falling === false) {
                    this.heading = this.dir;
                }
            } else {
                this.heading = this.dir;
            }

        } else if (entity.vel.x !== 0) {
            const decel = Math.min(absX, this.deceleration * deltaTime);
            entity.vel.x += entity.vel.x > 0 ? -decel : decel;
        } else {
            this.distance = 0;
        }

        const drag = this.dragFactor * entity.vel.x * absX;
        entity.vel.x -= drag;

        this.distance += absX * deltaTime;
    }
}
class PendulumMove extends Trait {
    constructor() {
        super();
        this.enabled = true;
        this.speed = -30;
    }

    obstruct(entity, side) {
        if (side === 'left' || side === 'right') {
            this.speed = -this.speed;
        }
    }
    update(entity) {
        if (this.enabled) {
            entity.vel.x = this.speed;
        }
    }
}
class Matrix {
    constructor() {
        this.grid = [];
    }

    forEach(callback) {
        this.grid.forEach((column, x) => {
            column.forEach((value, y) => {
                callback(value, x, y);
            });
        });
    }

    delete(x, y) {
        const col = this.grid[x];
        if (col) {
            delete col[y];
        }
    }

    get(x, y) {
        const col = this.grid[x];
        if (col) {
            return col[y];
        }
        return undefined;
    }

    set(x, y, value) {
        if (!this.grid[x]) {
            this.grid[x] = [];
        }

        this.grid[x][y] = value;
    }
}
class TileResolver {
    constructor(matrix, tileSize = 16) {
        this.matrix = matrix;
        this.tileSize = tileSize;
    }

    toIndex(pos) {
        return Math.floor(pos / this.tileSize);
    }

    toIndexRange(pos1, pos2) {
        const pMax = Math.ceil(pos2 / this.tileSize) * this.tileSize;
        const range = [];
        let pos = pos1;
        do {
            range.push(this.toIndex(pos));
            pos += this.tileSize;
        } while (pos < pMax);
        return range;
    }

    getByIndex(indexX, indexY) {
        const tile = this.matrix.get(indexX, indexY);
        if (tile) {
            const x1 = indexX * this.tileSize;
            const x2 = x1 + this.tileSize;
            const y1 = indexY * this.tileSize;
            const y2 = y1 + this.tileSize;
            return {
                tile,
                indexX,
                indexY,
                x1,
                x2,
                y1,
                y2,
            };
        }
    }

    searchByPosition(posX, posY) {
        return this.getByIndex(
            this.toIndex(posX),
            this.toIndex(posY));
    }

    searchByRange(x1, x2, y1, y2) {
        const matches = [];
        this.toIndexRange(x1, x2).forEach(indexX => {
            this.toIndexRange(y1, y2).forEach(indexY => {
                const match = this.getByIndex(indexX, indexY);
                if (match) {
                    matches.push(match);
                }
            });
        });
        return matches;
    }
}
class TileCollider {
    constructor() {
        this.resolvers = [];
    }

    addGrid(tileMatrix) {
        this.resolvers.push(new TileResolver(tileMatrix));
    }

    checkX(entity, gameContext, level) {
        let x;
        if (entity.vel.x > 0) {
            x = entity.bounds.right;
        } else if (entity.vel.x < 0) {
            x = entity.bounds.left;
        } else {
            return;
        }

        for (const resolver of this.resolvers) {
            const matches = resolver.searchByRange(
                x, x,
                entity.bounds.top, entity.bounds.bottom);

            matches.forEach(match => {
                this.handle(0, entity, match, resolver, gameContext, level);
            });
        }
    }

    checkY(entity, gameContext, level) {
        let y;
        if (entity.vel.y > 0) {
            y = entity.bounds.bottom;
        } else if (entity.vel.y < 0) {
            y = entity.bounds.top;
        } else {
            return;
        }

        for (const resolver of this.resolvers) {
            const matches = resolver.searchByRange(
                entity.bounds.left, entity.bounds.right,
                y, y);

            matches.forEach(match => {
                this.handle(1, entity, match, resolver, gameContext, level);
            });
        }
    }

    handle(index, entity, match, resolver, gameContext, level) {
        const tileCollisionContext = {
            entity,
            match,
            resolver,
            gameContext,
            level,
        };

        const handler = handlers[match.tile.type];
        if (handler) {
            handler[index](tileCollisionContext);
        }
    }
}
class EntityCollider {
    constructor(entities) {
        this.entities = entities;
    }

    check(subject) {
        this.entities.forEach(candidate => {
            if (subject === candidate) {
                return;
            }

            if (subject.bounds.overlaps(candidate.bounds)) {
                subject.collides(candidate);
            }
        });
    }
}
class GoombaBehavior extends Trait {
    collides(us, them) {
        if (us.traits.get(Killable).dead) {
            return;
        }

        if (them.traits.has(Stomper)) {
            if (them.vel.y > us.vel.y) {
                us.traits.get(Killable).kill();
                us.traits.get(PendulumMove).speed = 0;
            } else {
                const player=findPlayers(them);
                if(player){
                    player.coins=0;
                    player.score=0;
                }
                them.traits.get(Killable).kill();
                
            }
        }
    }
}
class BulletBehavior extends Trait {
    constructor() {
        super();
        this.gravity = new Gravity();
    }

    collides(us, them) {
        if (us.traits.get(Killable).dead) {
            return;
        }

        if (them.traits.has(Stomper)) {
            if (them.vel.y > us.vel.y) {
                us.traits.get(Killable).kill();
                us.vel.set(100, -200);
            } else {
                them.traits.get(Killable).kill();
            }
        }
    }

    update(entity, gameContext, level) {
        if (entity.traits.get(Killable).dead) {
            this.gravity.update(entity, gameContext, level);
        }
    }
}
const STATE_WALKING = Symbol('walking');
const STATE_HIDING = Symbol('hiding');
const STATE_PANIC = Symbol('panic');
class KoopaBehavior extends Trait {
    constructor() {
        super();

        this.hideTime = 0;
        this.hideDuration = 5;

        this.walkSpeed = null;
        this.panicSpeed = 300;

        this.state = STATE_WALKING;
    }

    collides(us, them) {
        if (us.traits.get(Killable).dead) {
            return;
        }

        if (them.traits.has(Stomper)) {
            if (them.vel.y > us.vel.y) {
                this.handleStomp(us, them);
            } else {
                this.handleNudge(us, them);
            }
        }
    }

    handleNudge(us, them) {
        if (this.state === STATE_WALKING) {
            const player=findPlayers(them);
            if(player){
                player.coins=0;
                player.score=0;
            }
            them.traits.get(Killable).kill();

        } else if (this.state === STATE_HIDING) {
            this.panic(us, them);
        } else if (this.state === STATE_PANIC) {
            const travelDir = Math.sign(us.vel.x);
            const impactDir = Math.sign(us.pos.x - them.pos.x);
            if (travelDir !== 0 && travelDir !== impactDir) {
                them.traits.get(Killable).kill();
            }
        }
    }

    handleStomp(us, them) {
        if (this.state === STATE_WALKING) {
            this.hide(us);
        } else if (this.state === STATE_HIDING) {
            us.traits.get(Killable).kill();
            us.vel.set(100, -200);
            us.traits.get(Solid).obstructs = false;
        } else if (this.state === STATE_PANIC) {
            this.hide(us);
        }
    }

    hide(us) {
        us.vel.x = 0;
        us.traits.get(PendulumMove).enabled = false;
        if (this.walkSpeed === null) {
            this.walkSpeed = us.traits.get(PendulumMove).speed;
        }
        this.hideTime = 0;
        this.state = STATE_HIDING
    }

    unhide(us) {
        us.traits.get(PendulumMove).enabled = true;
        us.traits.get(PendulumMove).speed = this.walkSpeed;
        this.state = STATE_WALKING;
    }

    panic(us, them) {
        us.traits.get(PendulumMove).enabled = true;
        us.traits.get(PendulumMove).speed = this.panicSpeed * Math.sign(them.vel.x);
        this.state = STATE_PANIC;
    }

    update(us, gameContext) {
        const deltaTime = gameContext.deltaTime;
        if (this.state === STATE_HIDING) {
            this.hideTime += deltaTime;
            if (this.hideTime > this.hideDuration) {
                this.unhide(us);
            }
        }
    }
}
const EVENT_STOMP = Symbol('stomp');
class Stomper extends Trait {
    constructor() {
        super();
        this.bounceSpeed = 400;
    }

    bounce(us, them) {
        us.bounds.bottom = them.bounds.top;
        us.vel.y = -this.bounceSpeed;
    }

    collides(us, them) {
        if (!them.traits.has(Killable) || them.traits.get(Killable).dead) {
            return;
        }

        if (us.vel.y > them.vel.y) {
            this.queue(() => this.bounce(us, them));
            us.sounds.add('stomp');
            us.events.emit(Stomper.EVENT_STOMP, us, them);
        }
    }
}
class Trigger extends Trait {
    constructor() {
        super();
        this.touches = new Set();
        this.conditions = [];
    }

    collides(_, them) {
        this.touches.add(them);
    }

    update(entity, gameContext, level) {
        if (this.touches.size > 0) {
            for (const condition of this.conditions) {
                condition(entity, this.touches, gameContext, level);
            }
            this.touches.clear();
        }
    }
}
class Killable extends Trait {
    constructor() {
        super();
        this.dead = false;
        this.deadTime = 0;
        this.removeAfter = 2;
    }

    kill() {
        this.queue(() => {this.dead = true
        });
    }

    revive() {
        this.dead = false;
        this.deadTime = 0;
    }

    update(entity, {deltaTime}, level) {
        if (this.dead) {
            this.deadTime += deltaTime;
            if (this.deadTime > this.removeAfter) {
                this.queue(() => {
                    level.entities.delete(entity);
                });
            }
        }
    }
}
class Solid extends Trait {
    constructor() {
        super();
        this.obstructs=true;
        
    }
    obstruct(entity, side,match) {
        if(!this.obstructs)
            return;
        if (side === 'bottom') {
            entity.bounds.bottom = match.y1;
            entity.vel.y = 0;
        } else if (side === 'top') {
            entity.bounds.top = match.y2;
             entity.vel.y = 0;
        }
        else if(side=='left'){
            entity.bounds.left = match.x2;
            entity.vel.x = 0;
        }
        else if(side=='right'){
            entity.bounds.right = match.x1;
            entity.vel.x = 0;
        }
    }
}
class Physics extends Trait {
    update(entity, gameContext, level) {
        const {deltaTime} = gameContext;
        entity.pos.x += entity.vel.x * deltaTime;
        level.tileCollider.checkX(entity, gameContext, level);

        entity.pos.y += entity.vel.y * deltaTime;
        level.tileCollider.checkY(entity, gameContext, level);

        entity.vel.y += level.gravity * deltaTime;
    }
}
class Velocity extends Trait {
    constructor() {
        super();
    }

    update(entity, {deltaTime}, level) {
        entity.pos.x += entity.vel.x * deltaTime;
        entity.pos.y += entity.vel.y * deltaTime;
    }
}
class Gravity extends Trait {
    update(entity, {deltaTime}, level) {
        entity.vel.y += level.gravity * deltaTime;
    }
}
class LevelTimer extends Trait {
    static EVENT_TIMER_HURRY = Symbol('timer hurry');
    static EVENT_TIMER_OK = Symbol('timer ok');

    constructor() {
        super();
        this.totalTime = 300;
        this.currentTime = this.totalTime;
        this.hurryTime = 100;
        this.hurryEmitted = null;
    }

    update(entity, {deltaTime}, level) {
        this.currentTime -= deltaTime * 2;
        if (this.hurryEmitted !== true && this.currentTime < this.hurryTime) {
            level.events.emit(LevelTimer.EVENT_TIMER_HURRY);
            this.hurryEmitted = true;
        }
        if (this.hurryEmitted !== false && this.currentTime > this.hurryTime) {
            level.events.emit(LevelTimer.EVENT_TIMER_OK);
            this.hurryEmitted = false;
        }
    }
}
class Player extends Trait {
    constructor() {
        super();
        this.name = "UNNAMED";
        this.coins = 0;
        this.lives = 1;
        this.score = 0;
        this.listen(Stomper.EVENT_STOMP, () => {
            this.score += 100;
            console.log('Score', this.score);
        });
    }

    addCoins(count) {
        this.coins += count;
        this.queue(entity => entity.sounds.add('coin'));
        while (this.coins >= 100) {
            this.addLives(1);
            this.coins -= 100;
        }
    }

    addLives(count) {
        this.lives += count;
    }
}
class InputRouter {
    constructor() {
        this.receivers = new Set();
    }

    addReceiver(receiver) {
        this.receivers.add(receiver);
    }

    dropReceiver(receiver) {
        this.receivers.delete(receiver);
    }

    route(routeInput) {
        for (const receiver of this.receivers) {
            routeInput(receiver);
        }
    }
}
class Emitter extends Trait {
    constructor() {
        super();
        this.interval = 2;
        this.coolDown = this.interval;
        this.emitters = [];
    }

    emit(entity, gameContext, level) {
        for (const emitter of this.emitters) {
            emitter(entity, gameContext, level);
        }
    }

    update(entity, gameContext, level) {
        const {deltaTime} = gameContext;
        this.coolDown -= deltaTime;
        if (this.coolDown <= 0) {
            this.emit(entity, gameContext, level);
            this.coolDown = this.interval;
        }
    }
}
class PlayerController extends Trait {
    constructor() {
        super();
        this.checkpoint = new Vec2(0, 0);
        this.player = null;
    }

    setPlayer(entity) {
        this.player = entity;
    }

    update(entity, {deltaTime}, level) {
        if (!level.entities.has(this.player)) {
            this.player.traits.get(Killable).revive();
            this.player.pos.set(this.checkpoint.x, this.checkpoint.y);
            level.entities.add(this.player);
        }
    }
} 
class MusicPlayer {
    constructor() {
        this.tracks = new Map();
    }
    addTrack(name, url) {
        const audio = new Audio();
        audio.loop = true;
        audio.src = url;
        this.tracks.set(name, audio);
    }

    playTrack(name) {
        this.pauseAll();
        const audio = this.tracks.get(name);
        audio.play();
        return audio;
    }

    pauseAll() {
        for (const audio of this.tracks.values()) {
            
            audio.pause();
        }
    }
}
class MusicController {
    constructor() {
        this.player = null;
    }

    setPlayer(player) {
        this.player = player;
    }

    playTheme(speed = 1) {
        const audio = this.player.playTrack('main');
        audio.playbackRate = speed;
    }

    playHurryTheme() {
        const audio = this.player.playTrack('hurry');
        audio.loop = false;
        audio.addEventListener('ended', () => {
            this.playTheme(1.3);
        }, {once: true});
    }

    pause() {
        this.player.pauseAll();
    }
}
function focusPlayer(level) {
    for (const player of findPlayers(level.entities)) {
        level.camera.pos.x = Math.max(0, player.pos.x - 100);
    }
}
class Camera {
    constructor() {
        this.pos = new Vec2(0, 0);
        this.size = new Vec2(256, 224);
    }
}
class SceneRunner {
    constructor() {
        this.sceneIndex = -1;
        this.scenes = [];
       
    }

    addScene(scene) {
        scene.events.listen(Scene.EVENT_COMPLETE, () => {
            this.runNext();
        });
        this.scenes.push(scene);
    }

    runNext() {
        const currentScene = this.scenes[this.sceneIndex];
        if (currentScene) {
            currentScene.pause();
        }
        this.sceneIndex++;
    }

    update(gameContext) {
        const currentScene = this.scenes[this.sceneIndex];
        if (currentScene) {
            currentScene.update(gameContext);
            currentScene.draw(gameContext);
        }
    }
    checkWin(){
        // const currentScene = this.scenes[this.sceneIndex];
        // if(currentScene){
        //     if(currentScene.win){
        //         this.runNext();
        //     }
        // }
    }
}
class Scene {
    static EVENT_COMPLETE = Symbol('scene complete');

    constructor() {
        this.events = new EventEmitter();
        this.comp = new Compositor();
        this.win=false;
    }

    draw(gameContext) {
        this.comp.draw(gameContext.videoContext);
    }

    update(gameContext) {
        
    }

    pause() {
        
    }

}
class Level extends Scene {
    static EVENT_TRIGGER = Symbol('trigger');
    constructor() {
        super();

        this.name = "";

        this.gravity = 1500;
        this.totalTime = 0;

        this.camera = new Camera();

        this.music = new MusicController();

        this.entities = new Set();

        this.entityCollider = new EntityCollider(this.entities);
        this.tileCollider = new TileCollider();
        this.win=false;
    }

    draw(gameContext) {
        this.comp.draw(gameContext.videoContext, this.camera);
    }

    update(gameContext) {
        this.entities.forEach(entity => {
            entity.update(gameContext, this);
        });

        this.entities.forEach(entity => {
            this.entityCollider.check(entity);
        });

        this.entities.forEach(entity => {
            entity.finalize();
        });
        focusPlayer(this);
        this.totalTime += gameContext.deltaTime;
        if(this.totalTime>=150 || (getPlayer(this.entities)==undefined)){
          this.win=true;
          setTimeout(()=>{
            this.events.emit(Scene.EVENT_COMPLETE);
            },30);
            playAgainButton.style.display='block';
        }
    }
    pause() {
        this.music.pause();
    }
}

class TimedScene extends Scene {
    constructor() {
        super();
        this.countDown = 2;
    }

    update(gameContext) {
        this.countDown -= gameContext.deltaTime;
        if (this.countDown <= 0) {
            this.events.emit(Scene.EVENT_COMPLETE);
            
        }
    }
}

class Font {
    constructor(sprites, size) {
        this.sprites = sprites;
        this.size = size;
    }

    print(text, context, x, y) {
        [...text].forEach((char, pos) => {
            this.sprites.draw(char, context, x + pos * this.size, y);
        });
    }
}

//drawing
async function main(canvas) {
    
    const videoContext = canvas.getContext('2d');
    const audioContext = new AudioContext();

    const [entityFactory, font] = await Promise.all([
        loadEntities(audioContext),
        loadFont(),
    ]);


    const loadLevel = await createLevelLoader(entityFactory);

    const sceneRunner = new SceneRunner();

    const mario = entityFactory.mario();
    
    makePlayer(mario, "MARIO");
    const inputRouter = setupKeyboard(window);
    inputRouter.addReceiver(mario);
    async function runLevel(name) {
        const loadScreen = new Scene();
        loadScreen.comp.layers.push(createColorLayer('#000'));
        loadScreen.comp.layers.push(createTextLayer(font, `Loading ${name}...`));
        sceneRunner.addScene(loadScreen);
        sceneRunner.runNext();
        const level = await loadLevel(name);

        level.events.listen(Level.EVENT_TRIGGER, (spec, trigger, touches) => {
            if (spec.type === "goto") {
                for (const _ of findPlayers(touches)) {
                    runLevel(spec.name);
                    return;
                }
            }
        });
        const playerProgressLayer = createPlayerProgressLayer(font, level);
        const dashboardLayer = createDashboardLayer(font, level);
        const gameOverLayer=displayGameOver(font,level);
        mario.pos.set(0, 0);
        level.entities.add(mario);

        const playerEnv = createPlayerEnv(mario);
        level.entities.add(playerEnv);
        playAgainButton.addEventListener('click',()=>{
            level.win=false;
        })
        const waitScreen = new TimedScene();
        waitScreen.countDown = 2;
        waitScreen.comp.layers.push(createColorLayer('#000'));
        waitScreen.comp.layers.push(dashboardLayer);
        waitScreen.comp.layers.push(playerProgressLayer);
        sceneRunner.addScene(waitScreen);
        level.comp.layers.push(dashboardLayer);
        level.comp.layers.push(gameOverLayer);
        sceneRunner.addScene(level);
        sceneRunner.runNext();
        return level;
    }

    const gameContext = {
        audioContext,
        videoContext,
        entityFactory,
        deltaTime: null,
        font
    };

    const timer = new Timer(1/60);
    timer.update = function update(deltaTime) {
        gameContext.deltaTime = deltaTime;
        sceneRunner.update(gameContext);
        if(mario.pos.y>canvas.clientHeight){
            console.log(mario)
            mario.traits.get(Killable).dead=true;
            if (mario.traits.get(Killable).dead==true){
                mario.traits.get(Player).score=0;
                mario.traits.get(Player).coins=0;
                
            }
            this.cancel();
        }
        if(mario.traits.get(Killable).dead==true){
            mario.traits.get(Player).score=0;
                mario.traits.get(Player).coins=0;
                mario.pos.set(10,10);
        }   
        if(level.win){
                
                sceneRunner.runNext();
        }
    }
    timer.start();
    let level= runLevel('1-1');
    playAgainButton.addEventListener('click',()=>{

        setTimeout(()=>{level=runLevel('1-1');},1);
        playAgainButton.style.display='none';
    });
}
const canvas = document.getElementById('screen');

const start = () => {
    window.removeEventListener('click', start);
    main(canvas);
};

window.addEventListener('click', start);
window.addEventListener('click',()=>{
    document.getElementById('divs').style.display='none';
})