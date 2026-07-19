// 前回のCharacterクラスがあると仮定（簡易版）
class Character {
  constructor({name, hp, maxHp,hasUsedSkill = false}) {
    this.name = name;
    this.hp = hp;
    this.maxHp = maxHp;
    this.hasUsedSkill = hasUsedSkill;
  }

  useSkill(){
    return new Character({...this, hasUsedSkill: true});
  }

  turnEnd(){
    return new Character({...this, hasUsedSkill : false});
  }

  damage(value){
    return new Character({
        ...this,
        hp : this.hp > value ? this.hp - value : 0
    })
  }
}

// --- ここに Room クラスを実装してください ---
class Room{
    constructor({name,characters = []}){
        this.name = name;
        this.characters = characters;
    }

    clone(NewProps){
        return new Room({
            name : this.name,
            characters : this.characters,
            ...NewProps
        })
    }

    addCharacter(chara){
        console.log(`${chara.name}が部屋${this.name}に入室しました。`);
        return this.clone({characters : [...this.characters,chara]});
    }

    listCharacters(){
        for(const chara of this.characters){
            console.log(`-${chara.name} (HP:${chara.hp}/${chara.maxHp})`);
        }
    }

    turnEnd(){
        console.log(`${this.name} のターンが終了しました。全キャラのスキル使用フラグをリセットします。`)
        const updateCharacters = this.characters.map(chara => chara.turnEnd());
        return this.clone({characters : updateCharacters});
    }
    
    updateCharacter(chara){
        const update = this.characters.map(mem =>{
            if(mem.name === chara.name){
                return chara;
            }
            return mem;
        })

        return this.clone({characters:update})
    }

    removeCharacter(name){
        console.log(`${name}が${this.name}から退室しました。`)
        const updateCharacters = this.characters.filter(chara => chara.name !== name);
        return this.clone({characters:updateCharacters});
    }
}
// === 動作確認（完全イミュータブルな運用） ===
let myRoom = new Room({ name: "決戦のバトルフィールド" });

// 1. 初期キャラクターを参加させる
const char1 = new Character({ name: "戦士ラグナ", hp: 12, maxHp: 20 });
const char2 = new Character({ name: "魔法使いリリィ", hp: 8, maxHp: 8 });

myRoom = myRoom.addCharacter(char1);
myRoom = myRoom.addCharacter(char2);

console.log("--- 初期状態 ---");
myRoom.listCharacters();

// 2. ラグナがスキルを使用し、部屋のデータを更新する
// 元の部屋（myRoom）や元のキャラ（char1）は一切破壊されません。
console.log("\n--- ラグナがスキルを使用 ---");
const updatedLaguna = char1.useSkill(); // 新しいラグナのインスタンスを作成
myRoom = myRoom.updateCharacter(updatedLaguna); // 新しい部屋インスタンスで上書き

myRoom.listCharacters(); // ラグナのスキルフラグだけが true になっている

// 3. リリィが5ダメージ受ける
console.log("\n--- リリィが5ダメージ受ける ---");
// 部屋から現在の最新のリリィのデータを取得してダメージを適用する（またはオブジェクトを直接指定）
const currentLily = myRoom.characters.find(c => c.name === "魔法使いリリィ");
const damagedLily = currentLily.damage(5); 
myRoom = myRoom.updateCharacter(damagedLily); // 部屋の状態を更新

myRoom.listCharacters(); // リリィのHPだけが 3/8 に減っている

// 4. ターン終了（全員のフラグが一括リセットされた新しい部屋が返る）
console.log("\n--- ターン終了を宣言 ---");
myRoom = myRoom.turnEnd();
myRoom.listCharacters(); // リリィのHPは減ったまま、ラグナのスキルフラグは false に戻っている！