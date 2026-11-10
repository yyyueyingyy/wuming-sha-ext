// ../_workbuddy_tmp/v41_build/m01.js
import { game, get } from "noname";
function index_default() {
  return {
    name: "diy001_lamasha",
    author: "\u4F60\u7684\u540D\u5B57",
    version: "1.0",
    // 注意：联机（connect）未实测，建议先在单机验证；如需联机请补 syncStorage 并实测。
    connect: false,
    editable: false,
    // 不显示「编辑此扩展」入口（对齐 demo_general）
    content() {
    },
    // 注册新势力「智械」—— 放在 precontent，确保角色加载前势力已存在
    precontent() {
      game.addGroup("zhixie", "\u68B0", "\u667A\u68B0", { color: "#4aa3df" });
    },
    package: {
      character: {
        character: {
          diy001_lamasha: {
            sex: "none",
            // 无性别
            group: "zhixie",
            // 智械（precontent 中注册）
            hp: 5,
            maxHp: 6,
            // 立绘：显式指定扩展内图片（get/index.js 会优先取 nameinfo.img）
            img: "extension/diy001_lamasha/image/character/diy001_lamasha.jpg",
            skills: ["diy001_tianfa", "diy001_tunshi", "diy001_zhu"]
          }
        },
        translate: {
          diy001_lamasha: "\u62C9\u739B\u5239"
        }
      },
      skill: {
        skill: {
          // ===================== 天罚（锁定技）=====================
          diy001_tianfa: {
            charlotte: true,
            // 锁定技
            mark: true,
            marktext: "\u6012",
            intro: {
              // 标记名（用于 addMark/removeMark 的战报文案，如「获得了1个怒」）
              name: "\u6012",
              // 直接读怒存储显示；用函数避免 "#" 占位符歧义
              content: function(storage, player, skill) {
                return "\u6012\uFF1A" + (player.storage.diy001_tianfa || 0);
              }
            },
            init(player) {
              player.storage.diy001_tianfa = 0;
              player.storage.diy001_nu_turn = 0;
            },
            // ① 减伤封顶：>1 伤害强制变 1（改值，严禁 trigger.cancel）
            trigger: { player: "damageBegin1" },
            forced: true,
            filter(event, player) {
              return event.num > 1;
            },
            content(event, trigger, player) {
              trigger.num = 1;
            },
            // ② 攒怒 + ③ 阵亡回馈 + 回合计数重置（子技能，常驻）
            group: ["diy001_tianfa_nu", "diy001_tianfa_die", "diy001_tianfa_reset"],
            subSkill: {
              nu: {
                charlotte: true,
                // 子技能随父锁定技不可被敌方 fengyin 封印
                trigger: { player: "damageEnd" },
                forced: true,
                filter(event, player) {
                  return event.player == player;
                },
                content(event, trigger, player) {
                  if (player.storage.diy001_nu_turn >= 3) return;
                  if ((player.storage.diy001_tianfa || 0) >= 7) return;
                  player.addMark("diy001_tianfa");
                  player.storage.diy001_nu_turn++;
                }
              },
              die: {
                charlotte: true,
                trigger: { global: "die" },
                forced: true,
                filter(event, player) {
                  return player.inRange(event.player);
                },
                async content(event, trigger, player) {
                  await player.recover();
                  await player.draw();
                }
              },
              reset: {
                charlotte: true,
                trigger: { player: "phaseEnd" },
                forced: true,
                content(event, trigger, player) {
                  player.storage.diy001_nu_turn = 0;
                }
              }
            }
          },
          // ===================== 吞噬漩涡（主动）=====================
          diy001_tunshi: {
            enable: "phaseUse",
            usable: 1,
            // 出牌阶段限一次（每轮仅一回合出牌，等价）
            filter(event, player) {
              return player.countCards("h") > 0;
            },
            filterTarget(card, player, target) {
              return target != player;
            },
            filterCard: true,
            position: "h",
            async content(event, trigger, player) {
              await player.discard(event.cards);
              const target = event.targets[0];
              target.addTempSkill("diy001_tunshi_seal", { player: "phaseEnd" });
              target.addTempSkill("fengyin", { player: "phaseEnd" });
              player.addTempSkill("diy001_tunshi_range", { player: "phaseBegin" });
              player.storage.diy001_tunshi_range_target = target;
            },
            ai: {
              order: 7,
              result: {
                target(player, target) {
                  return get.attitude(player, target) < 0 ? get.attitude(player, target) : 0;
                }
              },
              threaten: 1.2,
              expose: 0.2
            }
          },
          // 吞噬漩涡·封桃酒（临时技，仅 mod，不常驻技能栏）
          diy001_tunshi_seal: {
            mod: {
              // 禁用【桃】【酒】的使用；其余牌返回 undefined → 透传引擎默认判定
              cardEnabled(card, player, event) {
                const n = get.name(card);
                if (n === "tao" || n === "jiu") return false;
              },
              cardUsable(card, player, num) {
                const n = get.name(card);
                if (n === "tao" || n === "jiu") return 0;
              }
            }
          },
          // 吞噬漩涡·范围共享（临时技，仅 mod，挂在 拉玛刹 身上）
          diy001_tunshi_range: {
            mark: true,
            // 可见徽章：效果持续期间拉玛刹身上显示「涡」，回应"没显示"
            marktext: "\u6DA1",
            mod: {
              // 距离修正：拉玛刹 可打到「被共享射程的目标」射程内的角色
              globalFrom(from, to, distance) {
                const t = from.storage.diy001_tunshi_range_target;
                if (t && t.isAlive() && t.inRange(to)) return 1;
                return distance;
              }
            }
          },
          // ===================== 诛（限定技）=====================
          diy001_zhu: {
            limited: true,
            unique: true,
            enable: "phaseUse",
            filter(event, player) {
              return (player.storage.diy001_tianfa || 0) > 0;
            },
            async content(event, trigger, player) {
              const nu = player.storage.diy001_tianfa || 0;
              if (nu <= 0) return;
              const X = Math.min(3, 1 + Math.floor(nu / 3));
              player.removeMark("diy001_tianfa", nu);
              if ((player.storage.diy001_tianfa || 0) === 0) {
                player.unmarkSkill("diy001_tianfa");
              }
              const targets = game.filterPlayer(
                (cur) => cur !== player && cur.isAlive() && player.inRange(cur)
              );
              if (targets.length) {
                player.$skill("\u8BDB", "epic", "fire", true);
              }
              let hurt = 0;
              for (const t of targets) {
                player.line(t, "fire");
                const before = t.hp;
                await t.damage(X, player);
                if (t.hp < before) hurt++;
              }
              if (hurt > 0) await player.draw(Math.min(hurt, X));
              player.awakenSkill("diy001_zhu");
            },
            ai: {
              order: 9,
              result: { player: 1 },
              threaten: 3,
              expose: 0.5
            }
          }
        },
        translate: {
          diy001_tianfa: "\u5929\u7F5A",
          "diy001_tianfa_info": "\u9501\u5B9A\u6280\uFF0C\u5F53\u53D7\u5230\u5927\u4E8E1\u70B9\u7684\u4F24\u5BB3\u65F6\uFF0C\u4F24\u5BB3\u503C\u5F3A\u5236\u53D8\u4E3A1\u70B9\uFF1B\u6BCF\u5F53\u4F60\u53D7\u5230\u4F24\u5BB3\u65F6\uFF0C\u4F60\u83B7\u5F971\u4E2A\u300C\u6012\u300D\u6807\u8BB0\uFF08\u6BCF\u56DE\u5408\u81F3\u591A\u83B7\u5F973\u4E2A\uFF0C\u300C\u6012\u300D\u4E0A\u96507\uFF09\u3002\u82E5\u653B\u51FB\u8303\u56F4\u5185\u6709\u89D2\u8272\u9635\u4EA1\uFF0C\u4F60\u56DE\u590D1\u70B9\u4F53\u529B\u5E76\u6478\u4E00\u5F20\u724C\u3002",
          diy001_tunshi: "\u541E\u566C\u6F29\u6DA1",
          "diy001_tunshi_info": "\u51FA\u724C\u9636\u6BB5\u9650\u4E00\u6B21\uFF0C\u4F60\u53EF\u4EE5\u5F03\u7F6E\u4E00\u5F20\u724C\u5E76\u9009\u62E9\u4E00\u540D\u5176\u4ED6\u89D2\u8272\uFF0C\u4EE4\u5176\u672C\u56DE\u5408\u4E0D\u80FD\u4F7F\u7528\u3010\u6843\u3011\u548C\u3010\u9152\u3011\u4E14\u5176\u975E\u9501\u5B9A\u6280\u5931\u6548\uFF08\u88C5\u5907\u6280\u9664\u5916\uFF09\uFF1B\u5176\u7684\u653B\u51FB\u8303\u56F4\u4E5F\u89C6\u4E3A\u4F60\u7684\u653B\u51FB\u8303\u56F4\uFF0C\u6301\u7EED\u81F3\u4F60\u7684\u4E0B\u56DE\u5408\u5F00\u59CB\u3002",
          diy001_zhu: "\u8BDB",
          "diy001_zhu_info": "\u9650\u5B9A\u6280\uFF0C\u51FA\u724C\u9636\u6BB5\uFF0C\u4F60\u53EF\u4EE5\u6D88\u8017\u6240\u6709\u300C\u6012\u300D\u6807\u8BB0\uFF0C\u5BF9\u653B\u51FB\u8303\u56F4\u5185\u7684\u6BCF\u540D\u5176\u4ED6\u89D2\u8272\u5404\u9020\u6210X\u70B9\u4F24\u5BB3\uFF08X=1+\u230A\u6012/3\u230B\uFF0C\u81F3\u591A3\uFF09\uFF1B\u6BCF\u6709\u4E00\u540D\u89D2\u8272\u56E0\u6B64\u53D7\u5230\u4F24\u5BB3\uFF0C\u4F60\u6478\u4E00\u5F20\u724C\uFF08\u81F3\u591AX\u5F20\uFF09\u3002",
          "diy001_zhu_append": "\u300C\u6012\u300D\u4E3A\u5929\u7F5A\u79EF\u6512\u7684\u8D44\u6E90\u6807\u8BB0\uFF1BX\u5728\u53D1\u52A8\u65F6\u6309\u5F53\u524D\u300C\u6012\u300D\u7ED3\u7B97\u3002"
        }
      },
      intro: "",
      author: "\u4F60\u7684\u540D\u5B57",
      diskURL: "",
      forumURL: "",
      version: "1.0"
    },
    files: { character: [], card: [], skill: [], audio: [] }
  };
}

// ../_workbuddy_tmp/v41_build/m02.js
import { game as game2, get as get2 } from "noname";
function index_default2() {
  return {
    name: "\u6F5C\uFF08\u9ED1\u6697\u72E9\u730E\uFF09",
    author: "\u4F60\u7684\u540D\u5B57",
    version: "1.4",
    connect: false,
    editable: false,
    content() {
    },
    package: {
      character: {
        character: {
          qian_an: {
            sex: "male",
            group: "qun",
            hp: 2,
            maxHp: 3,
            names: "\u6F5C",
            // 立绘：显式指定扩展内图片（引擎默认找全局 image/character/<id>.jpg，扩展图须走 extension/ 前缀）
            img: "extension/diy002_qian/image/character/qian_an.jpg",
            skills: ["qian_zhouhun", "qian_huishou", "qian_caijue", "qian_shoulie"]
          }
        },
        translate: {
          qian_an: "\u6F5C"
        }
      },
      skill: {
        skill: {
          // ===================== 咒魂（触发技）=====================
          qian_zhouhun: {
            audio: 2,
            trigger: { player: "useCard" },
            filter(event, player) {
              return get2.name(event.card) === "sha" && event.targets && event.targets.length;
            },
            async content(event, trigger, player) {
              const target = trigger.targets[0];
              const card = await player.judge().forResultCard();
              if (get2.color(card) === "black") {
                target.damage(1, player, "sha");
              }
            },
            ai: { order: 6 }
          },
          // ===================== 回收（触发技：弃牌阶段结束后自动发动 + 被动上限）=====================
          qian_huishou: {
            audio: 2,
            // ① 手牌上限永久 +2（被动 mod，与触发无关）
            mod: {
              maxHandcard(player, num) {
                return num + 2;
              }
            },
            // ② 弃牌阶段结束后自动发动（trigger 形式，无需手动点按钮）
            //    ⚠️ 弃牌阶段本身只派发 "phaseDiscard"，引擎从未派发 "phaseDiscardEnd"
            //       （zhengsu 虽写成 phaseDiscardEnd 实为无效触发，属死代码）。
            //       "弃牌阶段结束后"的准确时机是下一阶段（结束阶段）开始，即 "phaseJieshuBegin"
            //       （闭月等 20+ 核心技能均以此名为结束阶段触发点）。
            //    ⚠️ phaseJieshuBegin 每名角色每回合仅派发一次，故本技能天然每回合最多发动一次，
            //       不再需要 usable 限制（usable 会累加成「整局仅一次」，反致后续回合失效）。
            trigger: { player: "phaseJieshuBegin" },
            filter(event, player) {
              return game2.players.filter((p) => p !== player && p.hasCards("h")).length > 0;
            },
            filterTarget(card, player, target) {
              return target !== player && target.hasCards("h");
            },
            async content(event, trigger, player) {
              const targets = await player.chooseTarget({
                prompt: "\u56DE\u6536\uFF1A\u9009\u62E9\u4E00\u540D\u5176\u4ED6\u6709\u624B\u724C\u7684\u89D2\u8272",
                filterTarget: (card, p, tg) => tg !== player && tg.hasCards("h")
              }).forResultTargets();
              const target = targets && targets[0];
              if (!target) return;
              let x = Math.min(target.countCards("h") - player.countCards("h"), 2);
              if (x > 0) {
                const cards = target.getCards("h").randomSort().slice(0, x);
                await target.give(cards, player);
              } else if (x < 0) {
                player.recover();
              }
            },
            ai: { order: 5, result: { target(player, target) {
              return get2.attitude(player, target);
            } } }
          },
          // ===================== 裁决（限定技）=====================
          qian_caijue: {
            audio: 2,
            limited: true,
            unique: true,
            enable: "phaseUse",
            filter(event, player) {
              return game2.players.filter((p) => p !== player && p.isAlive()).length > 0;
            },
            async content(event, trigger, player) {
              const others = game2.players.filter((p) => p !== player && p.isAlive());
              for (const p of others) {
                p.loseMaxHp(1);
              }
              await player.draw(others.length);
              const basics = player.getCards("h").filter((c) => get2.type(c) === "basic");
              if (basics.length === 0) return;
              const types = [...new Set(basics.map((c) => get2.name(c)))];
              const pick = await player.chooseControl(types).set("prompt", "\u88C1\u51B3\uFF1A\u5F03\u7F6E\u624B\u724C\u4E2D\u4E00\u7C7B\u57FA\u672C\u724C\uFF08\u8BE5\u7C7B\u5168\u90E8\uFF09").forResultControl();
              const discard = player.getCards("h").filter((c) => get2.name(c) === pick);
              await player.discard(discard);
              const opt = await player.chooseControl(["1", "2"]).set(
                "prompt",
                "\u88C1\u51B3\uFF1A1. \u4F60\u4E0E\u4E00\u540D\u5176\u4ED6\u89D2\u8272\u5404\u5F03\u7F6E\u624B\u724C\u4E0E\u88C5\u5907\u533A\u6240\u6709\u724C\uFF1B2. \u4EE4\u4E00\u540D\u5176\u4ED6\u89D2\u8272\u5BF9\u4F60\u9020\u62101\u70B9\u4F24\u5BB3\uFF08\u89C6\u4E3A\u5176\u5BF9\u4F60\u4F7F\u7528\u3010\u6740\u3011\uFF09\uFF0C\u4E14\u5176\u4F53\u529B\u4E0A\u9650-1"
              ).forResultControl();
              const targets = await player.chooseTarget({
                prompt: "\u88C1\u51B3\uFF1A\u9009\u62E9\u4E00\u540D\u5176\u4ED6\u89D2\u8272",
                filterTarget: (card, p, tg) => tg !== player && tg.isAlive()
              }).forResultTargets();
              const tgt = targets && targets[0];
              if (!tgt) return;
              if (opt === "1") {
                await player.discard(player.getCards("h").concat(player.getCards("e")));
                await tgt.discard(tgt.getCards("h").concat(tgt.getCards("e")));
              } else {
                await tgt.useCard({ name: "sha", isCard: true }, player, false).set("addCount", false);
                tgt.loseMaxHp(1);
              }
              player.awakenSkill("qian_caijue");
            },
            ai: { order: 9 }
          },
          // ===================== 狩猎（锁定技，死亡诅咒）=====================
          qian_shoulie: {
            audio: 2,
            charlotte: true,
            // ⚠️ 潜已死亡时自身技能默认被 filterTrigger 拦截（library/index.js：
            //    if (!info.forceDie && player.isDead()) return false）。
            //    但「死亡诅咒」正需要在潜阵亡那一刻对击杀者生效，故必须 forceDie:true，
            //    否则击杀者永远拿不到「黑暗狩猎」debuffer（本 bug 根因）。
            forceDie: true,
            forced: true,
            // 锁定技，命中即生效，不弹确认
            trigger: { global: "die" },
            filter(event, player) {
              return event.player === player && event.source && event.source !== player && event.source.isAlive();
            },
            async content(event, trigger, player) {
              const killer = trigger.source;
              killer.markSkill("qian_heiming");
              killer.storage.qian_heiming_count = 0;
              killer.storage.qian_heiming_round = game2.round;
              killer.addSkill("qian_shoulie_tick");
            }
          },
          // 狩猎诅咒 tick：挂在黑暗狩猎持有者身上的常驻子技能（可传承）
          //   - player:"phaseBegin"：自第 3 个回合起每回合 −1 上限（永久诅咒）
          //   - global:"die"（forceDie 允许阵亡触发）：持有者被击杀时，击杀者继承「黑暗狩猎」
          //     → 形成击杀链：潜死亡→A 获诅咒；A 死亡→B 获诅咒；B 死亡→C 获诅咒……无限传承
          qian_shoulie_tick: {
            charlotte: true,
            forceDie: true,
            // 持有者阵亡瞬间仍需触发死亡传承
            forced: true,
            // 锁定技，命中即生效
            trigger: { player: "phaseBegin", global: "die" },
            filter(event, player, name) {
              if (name === "die") {
                return !!(event.player === player && event.source && event.source !== player && event.source.isAlive());
              }
              return true;
            },
            async content(event, trigger, player) {
              if (trigger.name === "die") {
                const killer = trigger.source;
                killer.markSkill("qian_heiming");
                if (!killer.hasSkill("qian_shoulie_tick")) {
                  killer.storage.qian_heiming_count = 0;
                  killer.storage.qian_heiming_round = game2.round;
                  killer.addSkill("qian_shoulie_tick");
                }
                return;
              }
              player.storage.qian_heiming_count = (player.storage.qian_heiming_count || 0) + 1;
              if (player.storage.qian_heiming_count >= 3) {
                player.loseMaxHp(1);
              }
            }
          },
          // 黑暗狩猎 标记（仅徽章显示）
          qian_heiming: {
            mark: true,
            marktext: "\u72E9",
            intro: { content: "\u9ED1\u6697\u72E9\u730E" }
          }
        },
        translate: {
          qian_zhouhun: "\u5492\u9B42",
          qian_huishou: "\u56DE\u6536",
          qian_caijue: "\u88C1\u51B3",
          qian_shoulie: "\u72E9\u730E",
          qian_heiming: "\u9ED1\u6697\u72E9\u730E",
          "qian_zhouhun_info": "\u5F53\u4F60\u4F7F\u7528\u3010\u6740\u3011\u6307\u5B9A\u4E00\u540D\u89D2\u8272\u65F6\uFF0C\u4F60\u53EF\u8FDB\u884C\u5224\u5B9A\uFF0C\u82E5\u5224\u5B9A\u724C\u4E3A\u9ED1\u8272\uFF0C\u8BE5\u89D2\u8272\u989D\u5916\u53D7\u52301\u70B9\u4F24\u5BB3\uFF08\u89C6\u4E3A\u3010\u6740\u3011\u9020\u6210\u7684\u4F24\u5BB3\uFF09\u3002",
          "qian_huishou_info": "\u9501\u5B9A\u6280\uFF0C\u4F60\u7684\u624B\u724C\u4E0A\u9650+2\uFF1B\u5F03\u724C\u9636\u6BB5\u7ED3\u675F\u540E\uFF0C\u4F60\u53EF\u9009\u62E9\u4E00\u540D\u5176\u4ED6\u89D2\u8272\uFF0C\u82E5\u5176\u624B\u724C\u6570\u5927\u4E8E\u4F60\u7684\u624B\u724C\u6570\uFF0C\u4F60\u968F\u673A\u83B7\u5F97\u5176\u81F3\u591A2\u5F20\u624B\u724C\uFF1B\u82E5\u5176\u624B\u724C\u6570\u5C0F\u4E8E\u4F60\u7684\u624B\u724C\u6570\uFF0C\u4F60\u56DE\u590D1\u70B9\u4F53\u529B\uFF08\u6BCF\u56DE\u5408\u9650\u4E00\u6B21\uFF09\u3002",
          "qian_caijue_info": "\u9650\u5B9A\u6280\uFF0C\u51FA\u724C\u9636\u6BB5\uFF0C\u4F60\u4EE4\u9664\u4F60\u4EE5\u5916\u7684\u6240\u6709\u89D2\u8272\u5404\u5931\u53BB1\u70B9\u4F53\u529B\u4E0A\u9650\uFF0C\u7136\u540E\u4F60\u6478X\u5F20\u724C\uFF08X\u4E3A\u56E0\u6B64\u5931\u53BB\u4E0A\u9650\u7684\u89D2\u8272\u6570\uFF09\uFF1B\u4F60\u987B\u5F03\u7F6E\u624B\u724C\u4E2D\u4E00\u79CD\u57FA\u672C\u724C\uFF08\u82E5\u6709\uFF09\uFF0C\u7136\u540E\u4F60\u9009\u62E9\uFF1A1.\u4F60\u4E0E\u4E00\u540D\u5176\u4ED6\u89D2\u8272\u5404\u5F03\u7F6E\u5176\u624B\u724C\u548C\u88C5\u5907\u533A\u6240\u6709\u724C\uFF1B2.\u4EE4\u4E00\u540D\u5176\u4ED6\u89D2\u8272\u5BF9\u4F60\u9020\u62101\u70B9\u4F24\u5BB3\uFF08\u89C6\u4E3A\u5176\u5BF9\u4F60\u4F7F\u7528\u4E00\u5F20\u3010\u6740\u3011\uFF09\uFF0C\u4E14\u5176\u4F53\u529B\u4E0A\u9650-1\u3002",
          "qian_shoulie_info": "\u9501\u5B9A\u6280\uFF0C\u5F53\u4F60\u6B7B\u4EA1\u4E14\u6709\u51FB\u6740\u8005\u65F6\uFF0C\u4F60\u4EE4\u5176\u83B7\u5F97\u300C\u9ED1\u6697\u72E9\u730E\u300D\uFF1B\u5176\u88AB\u70D9\u5370\u540E\u7684\u7B2C3\u4E2A\u56DE\u5408\u5F00\u59CB\u65F6\u8D77\uFF0C\u5176\u6BCF\u4E2A\u56DE\u5408\u5931\u53BB1\u70B9\u4F53\u529B\u4E0A\u9650\uFF08\u6C38\u4E45\uFF09\u3002\u8BE5\u8BC5\u5492\u53EF\u968F\u51FB\u6740\u4F20\u627F\u2014\u2014\u51FB\u6740\u9ED1\u6697\u72E9\u730E\u6301\u6709\u8005\u7684\u4EBA\uFF0C\u4E5F\u4F1A\u83B7\u5F97\u300C\u9ED1\u6697\u72E9\u730E\u300D\u3002",
          "qian_heiming_info": "\u9ED1\u6697\u72E9\u730E\uFF1A\u88AB\u6F5C\u8BC5\u5492\u7684\u6807\u8BB0\u3002\u81EA\u7B2C3\u4E2A\u56DE\u5408\u8D77\u6BCF\u56DE\u5408\u5931\u53BB1\u70B9\u4F53\u529B\u4E0A\u9650\uFF08\u6C38\u4E45\uFF09\uFF1B\u53EF\u968F\u51FB\u6740\u4F20\u627F\u2014\u2014\u51FB\u6740\u6301\u6709\u8005\u7684\u4EBA\u4E5F\u4F1A\u83B7\u5F97\u6B64\u6807\u8BB0\u3002"
        }
      },
      intro: "",
      author: "\u4F60\u7684\u540D\u5B57",
      diskURL: "",
      forumURL: "",
      version: "1.4"
    },
    files: { character: [], card: [], skill: [], audio: [] }
  };
}

// ../_workbuddy_tmp/v41_build/m03.js
import { game as game3, ui, get as get3 } from "noname";
function index_default3() {
  return {
    name: "\u5947\u7075\u738B\uFF08\u5723\u6811\u795E\u5A01\uFF09",
    author: "\u4F60\u7684\u540D\u5B57",
    version: "1.4.1",
    connect: false,
    editable: false,
    content() {
    },
    package: {
      character: {
        character: {
          qiling_wang: {
            sex: "male",
            group: "qun",
            hp: 4,
            maxHp: 4,
            names: "\u5947\u7075\u738B",
            // 立绘：显式指定扩展内图片（引擎默认找全局 image/character/<id>.jpg，扩展图须走 extension/ 前缀）
            img: "extension/diy003_qilingwang/image/character/qiling_wang.jpg",
            skills: ["qiling_xuanjia", "qiling_xuanjia_shan", "qiling_xuanjia_tiesuo", "qiling_shiling", "qiling_chengjie", "qiling_chengjie_draw"]
          }
        },
        translate: {
          qiling_wang: "\u5947\u7075\u738B"
        }
      },
      // ===================== 虚拟防具卡【玄灵甲】=====================
      // 仅为玄甲①「视为装备着【玄灵甲】」提供视觉占位（addExtraEquip 需要真实卡 id，
      // 否则 get.subtype 取不到 equip2、占位不会显示）。list 为空 → 不进牌堆，永不被摸到。
      card: {
        card: {
          xuanlingjia: {
            fullskin: true,
            type: "equip",
            subtype: "equip2",
            ai: { basic: { equipValue: 6 } }
          }
        },
        translate: {
          xuanlingjia: "\u7384\u7075\u7532",
          xuanlingjia_info: "\u5947\u7075\u738B\u89C6\u4E3A\u88C5\u5907\u7740\u7684\u865A\u62DF\u9632\u5177\uFF08\u5723\u6811\u795E\u5A01\u6240\u51DD\u4E4B\u7532\uFF09\u3002"
        },
        list: []
      },
      skill: {
        skill: {
          // ===================== 玄甲（锁定技，①② 主技能 + ③ 独立技能）=====================
          qiling_xuanjia: {
            audio: 2,
            charlotte: true,
            // ① 视觉：视为装备着虚拟防具【玄灵甲】（官方 addExtraEquip 范式，参 tenggu）
            init(player, skill) {
              player.addExtraEquip(skill, "xuanlingjia", true, () => true);
            },
            onremove(player, skill) {
              player.removeExtraEquip(skill);
            },
            // ① 封锁：不能装备防具牌（否则真实防具会与【玄灵甲】冲突，且藤甲等自带技能与玄甲① 叠加）
            mod: {
              targetEnabled(card, player, target) {
                if (get3.subtypes(card)?.includes("equip2")) {
                  return false;
                }
              }
            },
            group: ["qiling_xuanjia_noequip"],
            subSkill: {
              // 兜底：若装备动作仍被强行发起（如技能强制装备），在 equipBefore 取消并弃置该牌
              noequip: {
                audio: 2,
                trigger: { player: "equipBefore" },
                filter(event, player) {
                  return get3.subtypes(event.card)?.includes("equip2");
                },
                forced: true,
                async content(event, trigger, player) {
                  trigger.cancel();
                  if (trigger.cards?.length) {
                    const map = /* @__PURE__ */ new Map(), targets = [];
                    for (const card of trigger.cards) {
                      const owner = get3.owner(card);
                      if (owner) {
                        targets.add(owner);
                        map.set(owner, (map.get(owner) ?? []).concat([card]));
                      }
                    }
                    if (targets.length) {
                      await game3.loseAsync({ map, targets, cards: trigger.cards }).setContent(async (event2, trigger2, player2) => {
                        const { map: map2, targets: targets2, cards } = event2;
                        for (const target of targets2) {
                          const lose = map2.get(target);
                          const next = target.lose(lose, ui.discardPile);
                          next.getlx = false;
                          await next;
                        }
                        game3.log(cards, "\u8FDB\u5165\u4E86\u5F03\u724C\u5806");
                      });
                    }
                  }
                }
              }
            },
            // ① 核心（【玄灵甲】效果）：受伤前置拦截（目标侧、可取消阶段）——来源须弃置一张【杀】，否则伤害无效
            trigger: { player: "damageBegin4" },
            filter(event, player) {
              return event.source && event.source !== player && event.source.isAlive();
            },
            async content(event, trigger, player) {
              const src = trigger.source;
              if (!src.getCards("h").some((c) => get3.name(c) === "sha")) {
                trigger.cancel();
                return;
              }
              const res = await src.chooseCard({
                position: "h",
                forced: true,
                prompt: "\u7384\u7532\uFF1A\u4F60\u987B\u5F03\u7F6E\u4E00\u5F20\u3010\u6740\u3011\uFF0C\u5426\u5219\u6B64\u4F24\u5BB3\u5BF9\u5947\u7075\u738B\u65E0\u6548",
                filterCard: (c) => get3.name(c) === "sha"
              }).forResult();
              if (!res || !res.cards || res.cards.length === 0) {
                trigger.cancel();
                return;
              }
              await src.discard(res.cards);
            }
            // ② 已拆为独立技能 qiling_xuanjia_shan（见下）。
            //    ⚠️ v1.4 根因：①（伤害 trigger + filter）与 ②（当【闪】viewAs）若同挂一个技能对象，
            //    会共用同一个 info.filter——而引擎 filterEnable（library/index.js:11184）在判
            //    "能否将防具当【闪】使用/打出"时会调用这个 filter（本意只该用于伤害时机），
            //    于是 ① 的伤害 filter 把 ② 的【闪】响应误判禁用 → 受伤响应【闪】时"只有取消"、
            //    选中藤甲也无法打出。故按官方【倾国】（standard/skill.js:898）范式拆为独立纯 viewAs 技能。
          },
          // ===================== 玄甲·御（②：手牌中的防具牌均视为【闪】）=====================
          //    ⚠️ 纯 viewAs 技能（无 trigger → 不产生 filter 冲突），范式同官方【倾国】：
          //    enable 含 chooseToRespond（响应【杀】/【万箭齐发】出闪）；position:"h" 仅限手牌；
          //    filterCard 判防具子类型 equip2（非 "armor"）；viewAsFilter/ai 同倾国给 AI 用。
          qiling_xuanjia_shan: {
            audio: 2,
            charlotte: true,
            enable: ["chooseToRespond", "chooseToUse"],
            viewAs: { name: "shan" },
            filterCard(card) {
              return get3.subtypes(card)?.includes("equip2");
            },
            viewAsFilter(player) {
              return player.countCards("h", (c) => get3.subtypes(c)?.includes("equip2")) > 0;
            },
            position: "h",
            prompt: "\u5C06\u4E00\u5F20\u624B\u724C\u4E2D\u7684\u9632\u5177\u724C\u5F53\u3010\u95EA\u3011\u4F7F\u7528\u6216\u6253\u51FA",
            check() {
              return 1;
            },
            ai: {
              order: 3,
              respondShan: true,
              skillTagFilter(player) {
                return player.countCards("h", (c) => get3.subtypes(c)?.includes("equip2")) > 0;
              },
              effect: {
                target(card, player, target, current) {
                  if (get3.tag(card, "respondShan") && current < 0) {
                    return 0.6;
                  }
                }
              }
            }
          },
          // ③ 每轮限一次，将【任意角色】装备区的一张防具牌当作【铁索连环】使用（独立技能）
          //    ⚠️ v1.3：因奇灵王不再能装备防具（见玄甲① 封锁），改取全场装备区的防具牌（含他人，
          //    对齐程序员文档 §9 待确认② 默认值「含他人」）。用 chooseButton 选牌 + chooseUseTarget 当铁索使用。
          qiling_xuanjia_tiesuo: {
            audio: 2,
            charlotte: true,
            enable: "phaseUse",
            round: 1,
            // ⚠️ 每轮限一次（本引擎支持 round:1 技能属性，bingshi/skill.js:1180 实证）
            filter(event, player) {
              return game3.players.some((pl) => pl.getCards("e").some((c) => get3.subtypes(c)?.includes("equip2")));
            },
            async content(event, trigger, player) {
              const list = [];
              for (const pl of game3.players) {
                list.addArray(pl.getCards("e").filter((c) => get3.subtypes(c)?.includes("equip2")));
              }
              if (!list.length) {
                return;
              }
              const result = await player.chooseButton(["\u7384\u7532\xB7\u94FE\uFF1A\u9009\u62E9\u573A\u4E0A\u4E00\u5F20\u9632\u5177\u724C\u5F53\u3010\u94C1\u7D22\u8FDE\u73AF\u3011\u4F7F\u7528", list], true).set("ai", (button) => {
                const owner = get3.owner(button.link);
                return (owner === player ? 1 : -get3.attitude(player, owner)) * 2 + 1;
              }).forResult();
              if (!result.bool) {
                return;
              }
              const card = result.links[0];
              const vcard = get3.autoViewAs({ name: "tiesuo" }, [card]);
              await player.chooseUseTarget(vcard, [card], false);
            },
            ai: { order: 6, result: { target: -1 }, expose: 0.1 }
          },
          // ===================== 噬灵（锁定技，双时机合并）=====================
          qiling_shiling: {
            audio: 2,
            charlotte: true,
            // ⚠️ 合并为单个 trigger 对象（source 造成伤 / player 受到伤）
            trigger: { source: "damageBegin1", player: "damageBegin3" },
            filter(event, player) {
              if (event.triggername === "damageBegin1") {
                return event.source === player;
              }
              return event.hasNature("thunder") && event.num > 1;
            },
            content(event, trigger, player) {
              if (event.triggername === "damageBegin1") {
                trigger.nature = "thunder";
              } else {
                trigger.num = 1;
              }
            }
          },
          // ===================== 惩戒（主技能①：主动当闪电）=====================
          // ⚠️ 注意：info.filter 会被引擎「双重使用」（既查 trigger 时机，也查 enable/viewAs 时机，
          //   见 library/index.js:11107 与 11184）。若被动② 的 trigger filter 与 ① 的 viewAs 共用
          //   同一 filter，会让 ① 的 viewAs 在「场上无闪电」时被错误禁用。因此② 必须拆成独立技能。
          qiling_chengjie: {
            audio: 2,
            // ① 出牌阶段，手牌黑桃 2~9 当【闪电】使用
            enable: "phaseUse",
            viewAs: { name: "shandian" },
            // ⚠️ 闪电卡 id 是 shandian（非 leidian）
            filterCard(card) {
              return get3.suit(card) === "spade" && get3.number(card) >= 2 && get3.number(card) <= 9;
            },
            ai: { order: 5, tag: "thunder", result: { target: -1 } }
          },
          // ===================== 惩戒·电（被动②：独立技能，准备阶段场上有闪电摸 1）=====================
          // ⚠️ 从 qiling_chengjie 拆出，避免与 ① 的 viewAs enable 共用 filter。
          //    场上有闪电的正确判法：遍历所有角色判定区（player.hasJudge("shandian")）；
          //    仓库引擎无 game.cards，旧写法 game.cards.some(...) 会读 undefined 的 .some 而崩。
          qiling_chengjie_draw: {
            audio: 2,
            trigger: { player: "phaseZhunbeiBegin" },
            // ⚠️ 真实触发名（phaseZhunbi 不存在）
            filter(event, player) {
              return game3.players.some((pl) => pl.isAlive() && pl.hasJudge("shandian"));
            },
            content(event, trigger, player) {
              player.draw(1);
            },
            ai: { tag: "draw" }
          }
        },
        translate: {
          qiling_xuanjia: "\u7384\u7532",
          qiling_xuanjia_shan: "\u7384\u7532\xB7\u5FA1",
          qiling_xuanjia_tiesuo: "\u7384\u7532\xB7\u94FE",
          qiling_shiling: "\u566C\u7075",
          qiling_chengjie: "\u60E9\u6212",
          qiling_chengjie_draw: "\u60E9\u6212\xB7\u7535",
          "qiling_xuanjia_info": "\u9501\u5B9A\u6280\uFF0C\u4F60\u4E0D\u80FD\u88C5\u5907\u9632\u5177\u724C\uFF0C\u4F60\u89C6\u4E3A\u88C5\u5907\u7740\u3010\u7384\u7075\u7532\u3011\uFF1A\u5176\u4ED6\u89D2\u8272\u5BF9\u4F60\u9020\u6210\u4F24\u5BB3\u65F6\uFF0C\u4F24\u5BB3\u6765\u6E90\u987B\u5F03\u7F6E\u4E00\u5F20\u3010\u6740\u3011\uFF0C\u5426\u5219\u6B64\u4F24\u5BB3\u65E0\u6548\u3002",
          "qiling_xuanjia_shan_info": "\u9501\u5B9A\u6280\uFF0C\u4F60\u624B\u724C\u4E2D\u7684\u9632\u5177\u724C\u5747\u89C6\u4E3A\u3010\u95EA\u3011\u3002",
          "qiling_xuanjia_tiesuo_info": "\u9501\u5B9A\u6280\uFF0C\u6BCF\u8F6E\u9650\u4E00\u6B21\uFF0C\u4F60\u53EF\u5C06\u573A\u4E0A\u88C5\u5907\u533A\u4E2D\u7684\u4E00\u5F20\u9632\u5177\u724C\u5F53\u4F5C\u4E00\u5F20\u3010\u94C1\u7D22\u8FDE\u73AF\u3011\u4F7F\u7528\u3002",
          "qiling_shiling_info": "\u9501\u5B9A\u6280\uFF0C\u4F60\u9020\u6210\u7684\u4F24\u5BB3\u5747\u89C6\u4E3A\u96F7\u7535\u4F24\u5BB3\uFF1B\u4F60\u6BCF\u6B21\u53D7\u5230\u7684\u96F7\u7535\u4F24\u5BB3\u81F3\u591A1\u70B9\u3002",
          "qiling_chengjie_info": "\u51FA\u724C\u9636\u6BB5\uFF0C\u4F60\u53EF\u5C06\u4E00\u5F20\u624B\u724C\u4E2D\u7684\u9ED1\u68432~9\u5F53\u3010\u95EA\u7535\u3011\u4F7F\u7528\u3002",
          "qiling_chengjie_draw_info": "\u9501\u5B9A\u6280\uFF0C\u51C6\u5907\u9636\u6BB5\uFF0C\u82E5\u573A\u4E0A\u6709\u89D2\u8272\u5224\u5B9A\u533A\u542B\u6709\u3010\u95EA\u7535\u3011\uFF0C\u4F60\u989D\u5916\u6478\u4E00\u5F20\u724C\u3002"
        }
      },
      intro: "",
      author: "\u4F60\u7684\u540D\u5B57",
      diskURL: "",
      forumURL: "",
      version: "1.4.1"
    },
    files: { character: [], card: [], skill: [], audio: [] }
  };
}

// ../_workbuddy_tmp/v41_build/m04.js
import { get as get4, _status } from "noname";
function refreshFalunMark(player) {
  const falun = player.storage.diy004_falun || {};
  const keys = Object.keys(falun).filter((k) => falun[k] > 0);
  if (keys.length === 0) {
    const n = player.countMark ? player.countMark("diy004_falun_mark") : 0;
    if (n > 0) player.removeMark("diy004_falun_mark", n, false);
  } else {
    player.setMark("diy004_falun_mark", keys.length, false);
    const lines = keys.map((k) => (get4.translation({ name: k }) || k) + "\xD7" + falun[k]);
    player.markSkill("diy004_falun_mark", {
      content: "\u6CD5\u8F6E\xB7\u5DF2\u8BB0\u9526\u56CA\u4F24\u5BB3\uFF08\u5C42\u6570=\u51CF\u4F24\uFF09\uFF1A\n" + lines.join("\uFF0C")
    });
  }
  const shi = player.storage.diy004_shiying_data || {};
  const skeys = Object.keys(shi);
  if (skeys.length === 0) {
    const n = player.countMark ? player.countMark("diy004_shiying") : 0;
    if (n > 0) player.removeMark("diy004_shiying", n, false);
  } else {
    player.setMark("diy004_shiying", skeys.length, false);
    const slines = skeys.map((k) => shi[k] || (get4.translation({ name: k }) || k));
    player.markSkill("diy004_shiying", {
      content: "\u9002\u5E94\xB7\u5DF2\u514D\u75AB\u7684\u9526\u56CA\u4F24\u5BB3\uFF1A\n" + slines.join("\uFF0C")
    });
  }
}
function index_default4() {
  return {
    name: "diy004_moxuoluo",
    author: "\u4F60\u7684\u540D\u5B57",
    version: "1.2",
    connect: false,
    editable: false,
    content() {
    },
    package: {
      character: {
        character: {
          diy004_moxuoluo: {
            sex: "male",
            group: "shen",
            // 神势力（异戒神将）
            hp: 15,
            maxHp: 15,
            skills: ["diy004_falun", "diy004_tuimo"],
            names: "\u9B54\u865A\u7F57",
            // ⚠️ 屏上将名用 names 字段，不用 translate
            // 立绘：显式指定扩展内图片（引擎默认找 extension/<扩展名>/<id>.jpg，扩展内图片须走 extension/ 前缀）
            img: "extension/diy004_moxuoluo/image/character/diy004_moxuoluo.jpg"
          }
        },
        translate: {
          diy004_moxuoluo: "\u9B54\u865A\u7F57"
        }
      },
      skill: {
        skill: {
          // ===================== 法轮（锁定技 · 适应引擎 + 双层减伤/免疫）=====================
          diy004_falun: {
            charlotte: true,
            // 锁定技
            // 法轮核心 mark 容器 + 适应容器 + 上次伤害类型（⑥同类加速）
            init(player) {
              player.storage.diy004_falun = {};
              player.storage.diy004_shiying_data = {};
              player.storage.diy004_lastDmgType = null;
            },
            // 拆四个子技能，避免伤害阶段冲突（坑①）
            group: ["diy004_falun_plus", "diy004_falun_core", "diy004_falun_peach", "diy004_falun_hand"],
            subSkill: {
              // ① 受伤 +2：必须在 damageBegin3（早于 B4 减免/免疫）
              plus: {
                trigger: { player: "damageBegin3" },
                forced: true,
                async content(event, trigger, player) {
                  trigger.num += 2;
                }
              },
              // ④⑤⑥ 减免 / 免疫 / 解析（damageBegin4，可取消）
              core: {
                trigger: { player: "damageBegin4" },
                forced: true,
                async content(event, trigger, player) {
                  if (!player.storage.diy004_falun) player.storage.diy004_falun = {};
                  if (!player.storage.diy004_shiying_data) player.storage.diy004_shiying_data = {};
                  const src = trigger.source;
                  const card = trigger.card;
                  const isTrick = card && get4.type(card) === "trick";
                  const cardId = isTrick ? get4.name(card) : null;
                  const typeKey = isTrick ? "trick_" + cardId : "char_" + (src ? src.playerid : "env");
                  const sameType = typeKey === player.storage.diy004_lastDmgType;
                  const extra = sameType ? 1 : 0;
                  player.storage.diy004_lastDmgType = typeKey;
                  if (src && src !== player) {
                    const jiexiBefore = src.storage.diy004_jiexi || 0;
                    if (jiexiBefore > 0) trigger.num = Math.max(0, trigger.num - jiexiBefore);
                    const room = 5 - jiexiBefore;
                    const add = Math.max(0, Math.min(1 + extra, room));
                    if (add > 0) src.addMark("diy004_jiexi", add);
                  }
                  if (isTrick) {
                    const falun = player.storage.diy004_falun;
                    falun[cardId] = (falun[cardId] || 0) + 1 + extra;
                    const cnt = falun[cardId];
                    if (cnt >= 3) {
                      delete falun[cardId];
                      const cn = get4.translation(card) || cardId;
                      player.storage.diy004_shiying_data[cardId] = cn;
                      trigger.cancel();
                      refreshFalunMark(player);
                      return;
                    } else {
                      trigger.num = Math.max(0, trigger.num - cnt);
                    }
                    refreshFalunMark(player);
                  }
                }
              },
              // ② 非濒死禁桃
              peach: {
                mod: {
                  cardUsable(card, player, num) {
                    if (!player.isDying() && get4.name(card) === "tao") return 0;
                    return num;
                  },
                  cardEnabled(card, player, event) {
                    if (!player.isDying() && get4.name(card) === "tao") return false;
                    return true;
                  }
                }
              },
              // ③ 手牌上限 = 体力上限
              hand: {
                mod: {
                  maxHandcard(player, num) {
                    return player.maxHp;
                  }
                }
              }
            }
          },
          // ===================== 退魔之剑（主动 · 报复成长输出）=====================
          diy004_tuimo: {
            audio: 2,
            enable: "phaseUse",
            usable: 1,
            filterTarget(card, player, target) {
              return target !== player && target.isAlive();
            },
            async content(event, trigger, player) {
              const target = event.targets[0];
              if (!target) return;
              const jiexi = target.storage.diy004_jiexi || 0;
              const isGodDevil = target.group === "shen" || target.group === "devil";
              const dmg = 1 + jiexi + (isGodDevil ? 1 : 0);
              await player.useCard({ name: "sha", isCard: true }, target, false).set("baseDamage", dmg).set("directHit", [target]);
            },
            ai: {
              order: 7,
              // 优先挑「解析最高」的敌人：负态度里按 target.storage.diy004_jiexi 加权
              result: {
                target(player, target) {
                  const att = get4.attitude(player, target);
                  if (att >= 0) return 0;
                  return att - (target.storage.diy004_jiexi || 0) * 0.5;
                }
              },
              threaten: 1.8,
              expose: 0.2
            },
            // 法轮⑤「解析≥5 不能响应」封锁（最高风险项）：用 source===魔虚罗 锁定，不依赖 viewAs storage
            //   cardRespondable 仅在 chooseToRespond 时触发；source = 那张【杀】的使用者（_status.event.getParent().player）
            mod: {
              cardRespondable(card, player, result) {
                const evt = _status.event;
                const source = evt && evt.getParent ? evt.getParent().player : null;
                if (source && source.hasSkill && source.hasSkill("diy004_falun") && (player.storage.diy004_jiexi || 0) >= 5) {
                  return false;
                }
                return result;
              }
            }
          },
          // 解析标记（显示在攻击者头上）
          diy004_jiexi: {
            mark: true,
            marktext: "\u6790",
            intro: { content: "\u89E3\u6790\uFF1A\u4F60\u5BF9\u9B54\u865A\u7F57\u9020\u6210\u7684\u4F24\u5BB3\u88AB\u524A\u51CF\uFF0C\u4E14\u8FBE\u52305\u65F6\u65E0\u6CD5\u54CD\u5E94\u5176\u3010\u6740\u3011/\u666E\u901A\u9526\u56CA\u3002" }
          },
          // 法轮桶可见标记（魔虚罗自己头上）：徽章数字=已记锦囊种类数，悬停看每种锦囊层数
          diy004_falun_mark: {
            mark: true,
            intro: {
              content: "\u6CD5\u8F6E\uFF1A\u8BB0\u5F55\u4F60\u53D7\u8FC7\u7684\u9526\u56CA\u4F24\u5BB3\u53CA\u5176\u5C42\u6570\uFF08\u5C42\u6570=\u51CF\u4F24\u503C\uFF09\u3002\u6EE13\u5C42\u8F6C\u4E3A\u300C\u9002\u5E94\u300D\u5E76\u514D\u75AB\u8BE5\u7C7B\u4F24\u5BB3\u3002"
            }
          },
          // 适应可见标记（魔虚罗自己头上）：徽章数字=已免疫的锦囊种类数，悬停看已免疫的锦囊
          diy004_shiying: {
            mark: true,
            intro: {
              content: "\u9002\u5E94\uFF1A\u4F60\u5BF9\u67D0\u7C7B\u9526\u56CA\u7684\u4F24\u5BB3\u7D2F\u8BA1\u8FBE\u52303\u5C42\u6CD5\u8F6E\u540E\uFF0C\u8F6C\u4E3A\u300C\u9002\u5E94\u300D\uFF0C\u6C38\u4E45\u514D\u75AB\u8BE5\u7C7B\u9526\u56CA\u4F24\u5BB3\u3002"
            }
          }
        },
        translate: {
          diy004_moxuoluo: "\u9B54\u865A\u7F57",
          diy004_falun: "\u6CD5\u8F6E",
          "diy004_falun_info": "\u9501\u5B9A\u6280\uFF0C\u4F60\u53D7\u5230\u7684\u4F24\u5BB3+2\uFF1B\u5F53\u4F60\u4E0D\u5904\u4E8E\u6FD2\u6B7B\u72B6\u6001\u65F6\uFF0C\u4F60\u4E0D\u80FD\u4F7F\u7528\u3010\u6843\u3011\uFF1B\u4F60\u7684\u624B\u724C\u4E0A\u9650\u7B49\u4E8E\u4F60\u7684\u4F53\u529B\u4E0A\u9650\u3002\u5F53\u4F60\u53D7\u5230\u9526\u56CA\u724C\u7684\u4F24\u5BB3\u65F6\uFF0C\u4F60\u83B7\u5F97\u8BE5\u9526\u56CA\u7684\u300C\u6CD5\u8F6E\u300D\u6807\u8BB01\u70B9\uFF08\u6BCF\u79CD\u9526\u56CA\u81F3\u591A3\u70B9\uFF09\uFF1A\u8FBE\u52301\u70B9\u8BE5\u7C7B\u578B\u4F24\u5BB3\u51CF\u5C111\uFF0C\u8FBE\u52302\u70B9\u51CF\u5C112\uFF0C\u8FBE\u52303\u70B9\u65F6\uFF0C\u79FB\u9664\u8BE5\u9526\u56CA\u7684\u300C\u6CD5\u8F6E\u300D\u6807\u8BB0\uFF0C\u83B7\u5F97\u300C\u9002\u5E94\xB7[\u9526\u56CA]\u300D\u6807\u8BB0\u5E76\u9632\u6B62\u8BE5\u7C7B\u578B\u5BF9\u4F60\u7684\u4F24\u5BB3\u3002\u5F53\u4F60\u53D7\u5230\u5176\u4ED6\u89D2\u8272\u7684\u4F24\u5BB3\u65F6\uFF0C\u8BE5\u89D2\u8272\u83B7\u5F97\u300C\u89E3\u6790\u300D\u6807\u8BB01\u70B9\uFF08\u6BCF\u540D\u89D2\u8272\u81F3\u591A5\u70B9\uFF09\uFF0C\u5176\u5BF9\u4F60\u9020\u6210\u7684\u4F24\u5BB3\u51CF\u5C11Y\u70B9\uFF08Y\u4E3A\u5176\u300C\u89E3\u6790\u300D\u6570\uFF09\uFF1B\u5176\u300C\u89E3\u6790\u300D\u8FBE\u52305\u70B9\u65F6\u4E0D\u80FD\u54CD\u5E94\u4F60\u4F7F\u7528\u7684\u3010\u6740\u3011\u6216\u666E\u901A\u9526\u56CA\u724C\u3002\u82E5\u6B64\u6B21\u4F24\u5BB3\u4E0E\u4F60\u4E0A\u6B21\u53D7\u5230\u7684\u4F24\u5BB3\u7C7B\u578B\u76F8\u540C\uFF0C\u5BF9\u5E94\u6807\u8BB0\u989D\u5916+1\u3002",
          diy004_tuimo: "\u9000\u9B54\u4E4B\u5251",
          "diy004_tuimo_info": "\u51FA\u724C\u9636\u6BB5\u9650\u4E00\u6B21\uFF0C\u4F60\u89C6\u4E3A\u5BF9\u4E00\u540D\u5176\u4ED6\u89D2\u8272\u4F7F\u7528\u4E00\u5F20\u9020\u6210\uFF081+\u76EE\u6807\u8EAB\u4E0A\u7684\u300C\u89E3\u6790\u300D\u6807\u8BB0\u6570\u91CF\uFF09\u70B9\u65E0\u5C5E\u6027\u4F24\u5BB3\u7684\u3010\u6740\u3011\uFF0C\u65E0\u8DDD\u79BB\u9650\u5236\u4E14\u65E0\u89C6\u9632\u5177\u3002\u82E5\u76EE\u6807\u62E5\u6709\u300C\u795E\u300D\u6216\u300C\u9B54\u300D\u52BF\u529B\uFF0C\u6B64\u4F24\u5BB3+1\u3002",
          "diy004_tuimo_append": "\u9000\u9B54\u4E4B\u5251\u89C6\u4F5C\u3010\u6740\u3011\uFF0C\u76EE\u6807\u53EF\u4EE5\u3010\u95EA\u3011\u54CD\u5E94\uFF1B\u4F24\u5BB3\u52A0\u6210\u53D6\u76EE\u6807\u8EAB\u4E0A\u7684\u300C\u89E3\u6790\u300D\u6807\u8BB0\u6570\uFF08\u5373\u5176\u5BF9\u4F60\u9020\u6210\u7684\u4F24\u5BB3\u88AB\u524A\u51CF\u7684\u540C\u540D\u6807\u8BB0\uFF09\uFF0C\u653B\u51FB\u8005\u89E3\u6790\u8D8A\u9AD8\uFF0C\u9000\u9B54\u4E4B\u5251\u6253\u5F97\u8D8A\u72E0\u3002",
          diy004_jiexi: "\u89E3\u6790",
          "diy004_jiexi_info": "\u89E3\u6790\uFF1A\u4F60\u5BF9\u9B54\u865A\u7F57\u9020\u6210\u7684\u4F24\u5BB3\u88AB\u524A\u51CF\uFF0C\u4E14\u8FBE\u52305\u65F6\u65E0\u6CD5\u54CD\u5E94\u5176\u3010\u6740\u3011/\u666E\u901A\u9526\u56CA\u3002",
          diy004_falun_mark: "\u6CD5\u8F6E",
          "diy004_falun_mark_info": "\u6CD5\u8F6E\uFF1A\u8BB0\u5F55\u4F60\u53D7\u8FC7\u7684\u9526\u56CA\u4F24\u5BB3\u53CA\u5176\u5C42\u6570\uFF08\u5C42\u6570=\u51CF\u4F24\u503C\uFF09\u3002\u6EE13\u5C42\u8F6C\u4E3A\u300C\u9002\u5E94\u300D\u5E76\u514D\u75AB\u8BE5\u7C7B\u4F24\u5BB3\u3002",
          diy004_shiying: "\u9002\u5E94",
          "diy004_shiying_info": "\u9002\u5E94\uFF1A\u5BF9\u67D0\u7C7B\u9526\u56CA\u7D2F\u8BA13\u5C42\u6CD5\u8F6E\u540E\u8F6C\u4E3A\u300C\u9002\u5E94\u300D\uFF0C\u6C38\u4E45\u514D\u75AB\u8BE5\u7C7B\u9526\u56CA\u4F24\u5BB3\u3002"
        }
      },
      intro: "",
      author: "\u4F60\u7684\u540D\u5B57",
      diskURL: "",
      forumURL: "",
      version: "1.2"
    },
    files: { character: [], card: [], skill: [], audio: [] }
  };
}

// ../_workbuddy_tmp/v41_build/m05.js
import { game as game4, get as get5, _status as _status2 } from "noname";
function refreshLiuYanMark(player) {
  const pend = player.storage.diy005_liuyan_pending || {};
  const ids = Object.keys(pend);
  const typeName = { basic: "\u57FA\u672C\u724C", trick: "\u9526\u56CA\u724C", equip: "\u88C5\u5907\u724C" };
  if (ids.length === 0) {
    if (player.countMark("diy005_liuyan_mark") > 0) player.removeMark("diy005_liuyan_mark");
    player.markSkill("diy005_liuyan_mark", { content: "\u516D\u773C\u9884\u6D4B\uFF1A\u6682\u65E0" });
    return;
  }
  const cur = player.countMark("diy005_liuyan_mark");
  if (cur !== ids.length) {
    if (cur > 0) player.removeMark("diy005_liuyan_mark", cur);
    player.addMark("diy005_liuyan_mark", ids.length);
  }
  let txt = "\u516D\u773C\u9884\u6D4B\uFF08" + ids.length + "\uFF09\uFF1A\n";
  const players = game4.players && game4.players.length ? game4.players : game4._players || [];
  for (const id of ids) {
    const p = players.find((x) => x.playerid === id);
    const nm = p ? get5.translation(p) : id;
    txt += "\xB7 " + nm + " \u2192 " + (typeName[pend[id]] || pend[id]) + "\n";
  }
  player.markSkill("diy005_liuyan_mark", { content: txt });
}
async function diy005_cangheDo(player, action, X) {
  const used = /* @__PURE__ */ new Set();
  for (let i = 0; i < X; i++) {
    if (action === "give" && player.countCards("h") <= 0) break;
    const candidates = game4.filterPlayer((p) => p !== player && p.isAlive() && !used.has(p.playerid));
    if (candidates.length === 0) break;
    if (action === "gain") {
      const tRes = await player.chooseTarget({
        prompt: "\u82CD\u8D6B\uFF1A\u9009\u62E9\u83B7\u5F97\u5176\u4E00\u5F20\u724C\u7684\u89D2\u8272\uFF08\u6BCF\u4EBA\u9650\u4E00\u6B21\uFF09",
        forced: true,
        // 防取消：必须选一个，不能跳过
        filterTarget: (card, p, target) => target !== player && target.isAlive() && !used.has(target.playerid) && target.countCards("he") > 0
      }).forResult();
      const t = tRes.targets && tRes.targets[0];
      if (!t) break;
      used.add(t.playerid);
      await player.gainPlayerCard(t, "he", true);
    } else {
      const tRes = await player.chooseTarget({
        prompt: "\u82CD\u8D6B\uFF1A\u9009\u62E9\u4EA4\u7ED9\u4E00\u5F20\u624B\u724C\u7684\u89D2\u8272\uFF08\u6BCF\u4EBA\u9650\u4E00\u6B21\uFF09",
        forced: true,
        filterTarget: (card, p, target) => target !== player && target.isAlive() && !used.has(target.playerid)
      }).forResult();
      const t = tRes.targets && tRes.targets[0];
      if (!t) break;
      used.add(t.playerid);
      await player.chooseToGive({ target: t, selectCard: [1, 1], position: "h", forced: true }).forResult();
    }
  }
}
function index_default5() {
  return {
    name: "diy005_gotoh",
    author: "\u4F60\u7684\u540D\u5B57",
    version: "1.7",
    connect: false,
    editable: false,
    content() {
    },
    package: {
      character: {
        character: {
          diy005_gotoh: {
            sex: "male",
            group: "shen",
            // 神势力（最强咒术师）
            hp: 4,
            maxHp: 4,
            skills: ["diy005_liuyan", "diy005_wuxian", "diy005_canghe", "diy005_xushi", "diy005_wuliang", "diy005_canghe_end"],
            names: "\u4E94\u6761\u609F",
            // ⚠️ 屏上将名用 names 字段，不用 translate
            // 立绘：扩展内图片须走 extension/ 前缀（同魔虚罗）
            img: "extension/diy005_gotoh/image/character/diy005_gotoh.jpg"
          }
        },
        translate: { diy005_gotoh: "\u4E94\u6761\u609F" }
      },
      skill: {
        skill: {
          // ===================== 眼（公用资源底座，mark:true 显示）=====================
          diy005_yan: {
            mark: true,
            marktext: "\u773C",
            intro: { content: "\u773C\uFF1A\u4E94\u6761\u609F\u6BCF\u8F6E\u8D44\u6E90\u3002\u56DE\u5408\u5F00\u59CB\u56DE\u6EE1\u81F3\u4E0A\u9650\uFF1B\u516D\u773C/\u65E0\u9650/\u82CD\u8D6B/\u865A\u5F0F\u5404\u80171\uFF0C\u65E0\u91CF\u7A7A\u5904\u780D\u4E0A\u9650\u3002" }
          },
          // ===================== 六眼（锁定 · 观测 + 类型 counter + 夺牌）=====================
          diy005_liuyan: {
            charlotte: true,
            // 锁定技
            // 眼资源底座（所有 diy005_* storage 字典集中初始化，单一来源）
            // ⚠️ 真实游戏里每个技能只调一次各自 init；无限/无量空处无独立 init，
            //    故其共享字典必须在本底座统一建好，否则 block.filter 读取 undefined 会崩溃。
            init(player) {
              player.storage.diy005_yan_max = 6;
              player.addMark("diy005_yan", 6);
              player.storage.diy005_liuyan_pending = {};
              player.storage.diy005_liuyan_count_round = 0;
              player.storage.diy005_round_used_liuyan = {};
              player.storage.diy005_wuxian_block = {};
              player.storage.diy005_canghe_pending = null;
              player.storage.diy005_xushi_min = 99;
              player.storage.diy005_xushi_max = 0;
              player.storage.diy005_xushi_active = false;
              player.storage.diy005_wuliang_acting = false;
              player.storage.diy005_wuliang_needturn = false;
              player.storage.diy005_wuliang_seal = [];
            },
            // —— 观测：他人的【摸牌阶段后、出牌阶段之前】（phaseUseBegin 即出牌开始），
            //     看其手牌并声明一张牌型；每轮限 2 次（roundStart 重置）——
            trigger: { global: "phaseUseBegin" },
            forced: false,
            filter(event, player) {
              const tp = event.player;
              if (!tp || tp === player) return false;
              if ((player.storage.diy005_liuyan_count_round || 0) >= 2) return false;
              if (player.storage.diy005_liuyan_pending[tp.playerid]) return false;
              return true;
            },
            async content(event, trigger, player) {
              const target = trigger.player;
              if (!target || target === player) return;
              const eye = player.countMark("diy005_yan");
              if (eye < 1) return;
              await player.viewHandcards(target);
              const cRes = await player.chooseControl({
                prompt: "\u516D\u773C\uFF1A\u58F0\u660E\u300C" + get5.translation(target) + "\u300D\u4E0B\u4E00\u5F20\u724C\u7684\u7C7B\u578B",
                controls: ["\u57FA\u672C\u724C", "\u9526\u56CA\u724C", "\u88C5\u5907\u724C"]
              }).forResult();
              const labelMap = { \u57FA\u672C\u724C: "basic", \u9526\u56CA\u724C: "trick", \u88C5\u5907\u724C: "equip" };
              const typeName = labelMap[cRes.control];
              if (!typeName) return;
              player.removeMark("diy005_yan", 1);
              player.storage.diy005_liuyan_pending[target.playerid] = typeName;
              player.storage.diy005_liuyan_count_round = (player.storage.diy005_liuyan_count_round || 0) + 1;
              refreshLiuYanMark(player);
            },
            group: ["diy005_liuyan_counter", "diy005_liuyan_roundreset"],
            subSkill: {
              // 每轮开始重置观测次数（六眼改「他人出牌前」，每轮限 2 次）
              roundreset: {
                trigger: { global: "roundStart" },
                forced: true,
                charlotte: true,
                content(event, trigger, player) {
                  player.storage.diy005_liuyan_count_round = 0;
                }
              },
              // counter：该角色下一张同类型牌无效 + 进弃牌堆可夺用
              counter: {
                trigger: { global: "useCard" },
                forced: true,
                charlotte: true,
                // ⚠️ global 触发：filter 的第1参 event 即被监听的 useCard 事件（参照 zf_qiaoquhaoduo）
                filter(event, player) {
                  const src = event.player;
                  if (src === player) return false;
                  const pend = player.storage.diy005_liuyan_pending[src.playerid];
                  if (!pend) return false;
                  return get5.type(event.card) === pend;
                },
                async content(event, trigger, player) {
                  trigger.cancel();
                  const card = trigger.card;
                  const srcId = trigger.player.playerid;
                  delete player.storage.diy005_liuyan_pending[srcId];
                  refreshLiuYanMark(player);
                  const bRes = await player.chooseBool("\u516D\u773C\uFF1A\u662F\u5426\u593A\u7528\u8FD9\u5F20\u88AB\u65E0\u6548\u7684\u724C\uFF1F").forResult();
                  if (!bRes.bool) return;
                  await player.gain(card, "gain2");
                  await player.chooseUseTarget(card);
                }
              }
            },
            ai: {
              // 回合结束优先观测威胁最大的敌人，声明其常出牌型
              skill(event, player) {
                return player.countMark("diy005_yan") >= 1;
              },
              result: {
                target(player, target) {
                  return -get5.attitude(player, target) + target.countCards("h") * 0.1;
                }
              }
            }
          },
          // ===================== 无限（锁定 · 眼回满 + 范围闪杀）=====================
          diy005_wuxian: {
            charlotte: true,
            // ① 回合开始（准备阶段）眼回满
            trigger: { player: "phaseZhunbeiBegin" },
            forced: true,
            content(event, trigger, player) {
              player.setMark("diy005_yan", player.storage.diy005_yan_max);
            },
            group: ["diy005_wuxian_guard", "diy005_wuxian_block"],
            subSkill: {
              // ② 他人出牌阶段开始，耗1眼锁其本回合【杀】
              guard: {
                trigger: { global: "phaseUseBegin" },
                forced: false,
                charlotte: true,
                // ⚠️ global 触发：filter 的 event 即出牌阶段开始事件（event.player = 该角色）
                filter(event, player) {
                  return event.player !== player && player.countMark("diy005_yan") >= 1;
                },
                async content(event, trigger, player) {
                  const attacker = trigger.player;
                  const bRes = await player.chooseBool("\u65E0\u9650\uFF1A\u6D88\u80171\u773C\uFF0C\u672C\u56DE\u5408\u5185\u82E5\u300C" + get5.translation(attacker) + "\u300D\u7684\u3010\u6740\u3011\u653B\u51FB\u8303\u56F4\u2264\u4F60\u7684\u773C\u6570\u5219\u65E0\u6548\uFF1F").forResult();
                  if (!bRes.bool) return;
                  player.removeMark("diy005_yan", 1);
                  player.storage.diy005_wuxian_block[attacker.playerid] = true;
                }
              },
              // ③ 被锁攻击者出【杀】打五条悟且攻≤眼 → 无效
              block: {
                trigger: { global: "useCardToTarget" },
                forced: true,
                charlotte: true,
                // ⚠️ global 触发：filter 的 event 即 useCardToTarget 事件
                filter(event, player) {
                  const card = event.card, src = event.player, tgt = event.target;
                  if (get5.name(card) !== "sha") return false;
                  if (tgt !== player) return false;
                  if (!player.storage.diy005_wuxian_block[src.playerid]) return false;
                  return src.getAttackRange() <= player.countMark("diy005_yan");
                },
                content(event, trigger, player) {
                  trigger.getParent().excluded.add(player);
                }
              }
            },
            ai: {
              skill(event, player) {
                const attacker = event.player;
                if (!attacker || attacker === player) return false;
                return player.countMark("diy005_yan") >= 1 && attacker.getAttackRange() <= player.countMark("diy005_yan");
              }
            }
          },
          // ===================== 苍赫（主动 · 掠夺/输送，X=眼数，结束补另一项）=====================
          diy005_canghe: {
            enable: "phaseUse",
            usable: 1,
            filter(event, player) {
              return player.countMark("diy005_yan") >= 1;
            },
            async content(event, trigger, player) {
              const eye = player.countMark("diy005_yan");
              const X = Math.max(1, eye);
              const gainLabel = "\u83B7\u5F97" + X + "\u540D\u5176\u4ED6\u89D2\u8272\u5404\u4E00\u5F20\u724C";
              const giveLabel = "\u4EA4\u7ED9" + X + "\u540D\u5176\u4ED6\u89D2\u8272\u5404\u4E00\u5F20\u624B\u724C";
              const cRes = await player.chooseControl({ prompt: "\u82CD\u8D6B\uFF1A\u9009\u62E9\u4E00\u9879", controls: [gainLabel, giveLabel] }).forResult();
              if (!cRes.control) return;
              const mainAction = cRes.control === gainLabel ? "gain" : "give";
              const otherAction = mainAction === "gain" ? "give" : "gain";
              player.removeMark("diy005_yan", 1);
              player.storage.diy005_canghe_pending = otherAction;
              player.storage.diy005_canghe_X = X;
              await diy005_cangheDo(player, mainAction, X);
            },
            group: [],
            ai: {
              order: 8,
              skill(event, player) {
                return player.countMark("diy005_yan") >= 1;
              },
              result: {
                // 优先对敌方掠夺、对友方输送
                target(player, target) {
                  return -get5.attitude(player, target);
                }
              }
            }
          },
          // ===================== 苍赫·补（衍生 · 结束阶段强制补另一项）=====================
          // ⚠️ 拆为顶层技能（不再作为 苍赫 的 group 子技能），避免回合结束阶段误弹「苍赫」按钮（bug③）
          diy005_canghe_end: {
            charlotte: true,
            forced: true,
            trigger: { player: "phaseJieshuBegin" },
            async content(event, trigger, player) {
              const pend = player.storage.diy005_canghe_pending;
              if (!pend) return;
              player.storage.diy005_canghe_pending = null;
              const X = player.storage.diy005_canghe_X || 1;
              await diy005_cangheDo(player, pend, X);
            }
          },
          // ===================== 六眼·预测标记（bug④：让玩家看到自己预测了什么）=====================
          diy005_liuyan_mark: {
            mark: true,
            marktext: "\u6D4B",
            intro: { content: "\u516D\u773C\u9884\u6D4B\u6807\u8BB0\uFF1A\u60AC\u505C\u67E5\u770B\u4F60\u9884\u6D4B\u7684\u5404\u89D2\u8272\u4E0B\u4E00\u5F20\u724C\u578B\u3002" }
          },
          // ===================== 虚式（主动 · 手牌整形 + 本回合无距离无次数）=====================
          diy005_xushi: {
            enable: "phaseUse",
            usable: 1,
            filter(event, player) {
              return player.countMark("diy005_yan") >= 1;
            },
            // 虚式激活后本回合（至 phaseEnd）无距离/无次数：mod 直接挂本体 + diy005_xushi_active 门控
            // ⚠️ 不再用 addTempSkill("diy005_xushi_free")：临时子技能会污染出牌阶段技能面板
            //    （苍赫/虚式按钮错乱 bug①），且其 mod 在 phaseUse 内未必被 checkMod 正确收集
            //    （无距离/无次数整体不生效 bug②）。mod 函数拿到的 from=出牌者 / player=用牌者 = 五条悟，
            //    故可在 mod 内用 storage 标记门控（game.checkMod 会把 cardUsable 的用牌者、globalFrom 的
            //    出牌者作为实参传入，详见 game/index.js:9002）。
            mod: {
              globalFrom(from, to, distance) {
                if (from && from.storage && from.storage.diy005_xushi_active) return -Infinity;
                return void 0;
              },
              cardUsable(card, player, num) {
                if (!player || !player.storage || !player.storage.diy005_xushi_active) return void 0;
                if (typeof num !== "number") return Infinity;
                return num + 100;
              }
            },
            async content(event, trigger, player) {
              player.removeMark("diy005_yan", 1);
              const lo = player.storage.diy005_xushi_min, hi = player.storage.diy005_xushi_max;
              const target = Math.ceil((lo + hi) / 2);
              const cur = player.countCards("h");
              if (cur > target) {
                await player.chooseToDiscard(cur - target, true);
              } else if (cur < target) {
                await player.draw(target - cur);
              }
              player.storage.diy005_xushi_active = true;
            },
            group: ["diy005_xushi_track"],
            subSkill: {
              // 记录本回合手牌极值（回合开始重置，避免跨轮污染）；phaseEnd 清除虚式激活标记
              track: {
                trigger: { player: ["phaseBegin", "gainAfter", "loseAfter", "phaseUseBegin", "phaseEnd"] },
                forced: true,
                charlotte: true,
                content(event, trigger, player) {
                  if (trigger.name === "phaseEnd") {
                    player.storage.diy005_xushi_active = false;
                    return;
                  }
                  if (trigger.name === "phaseBegin") {
                    const cur = player.countCards("h");
                    player.storage.diy005_xushi_min = cur;
                    player.storage.diy005_xushi_max = cur;
                    return;
                  }
                  const n = player.countCards("h");
                  if (n < player.storage.diy005_xushi_min) player.storage.diy005_xushi_min = n;
                  if (n > player.storage.diy005_xushi_max) player.storage.diy005_xushi_max = n;
                }
              }
            },
            ai: {
              order: 7,
              skill(event, player) {
                return player.countMark("diy005_yan") >= 1;
              }
            }
          },
          // ===================== 无量空处（觉醒 · 濒死翻盘 + 全员抉择 + 额外回合）=====================
          diy005_wuliang: {
            // 触发：进入濒死（事件名 "dying"，非 enterDying）
            trigger: { player: "dying" },
            forced: false,
            filter(event, player) {
              return !player.storage.diy005_wuliang_acting;
            },
            async content(event, trigger, player) {
              player.storage.diy005_wuliang_acting = true;
              player.storage.diy005_yan_max = Math.floor(player.storage.diy005_yan_max / 2);
              player.setMark("diy005_yan", Math.min(player.countMark("diy005_yan"), player.storage.diy005_yan_max));
              const X = Math.max(1, player.countMark("diy005_yan"));
              for (const other of game4.filterPlayer((p) => p !== player && p.isAlive())) {
                const drawLabel = "\u6478" + X + "\u5F20\u724C\uFF08\u4E0B\u56DE\u5408\u975E\u9501\u5B9A\u6280\u5931\u6548\u4E14\u4E0D\u80FD\u54CD\u5E94\u5176\u724C\uFF09";
                const loseLabel = "\u5931\u53BB" + (X + 1) + "\u5F20\u724C";
                const oRes = await other.chooseControl({ prompt: "\u65E0\u91CF\u7A7A\u5904\uFF08" + get5.translation(player) + "\uFF09\uFF1A\u9009\u62E9\u4E00\u9879", controls: [drawLabel, loseLabel] }).forResult();
                if (oRes.control === drawLabel) {
                  await other.draw(X);
                  const sealList = (other.skills || []).filter((s) => {
                    const info = get5.info(s);
                    return info && !info.charlotte && !info.locked;
                  });
                  other.storage.diy005_wuliang_sealer = player.playerid;
                  other.addSkill("diy005_wuliang_sealed");
                  if (sealList.length) {
                    other.storage.diy005_wuliang_seal = sealList;
                    other.disableSkill("diy005_wuliang_seal_reason", sealList);
                  }
                } else {
                  const loseN = X + 1;
                  await other.chooseToDiscard(loseN, true).forResult();
                }
              }
              await player.recover(X - player.hp);
              player.storage.diy005_wuliang_needturn = true;
              player.storage.diy005_wuliang_acting = false;
            },
            group: ["diy005_wuliang_extra", "diy005_wuliang_sealmod"],
            subSkill: {
              // 额外回合：任一角色结束阶段开始时，若待办，则插入五条悟的额外回合
              extra: {
                trigger: { global: "phaseJieshuBegin" },
                forced: true,
                charlotte: true,
                // ⚠️ global 触发：filter 的 event 即结束阶段开始事件（event.player = 该角色）
                filter(event, player) {
                  return !!player.storage.diy005_wuliang_needturn;
                },
                content(event, trigger, player) {
                  delete player.storage.diy005_wuliang_needturn;
                  player.insertPhase();
                }
              },
              // 被「摸X」封印角色：其回合结束时恢复非锁定技 + 移除封响应技能
              sealmod: {
                trigger: { global: "phaseEnd" },
                forced: true,
                charlotte: true,
                // ⚠️ global 触发：filter 的 event = 结束阶段的那名角色
                filter(event, player) {
                  const p = event.player;
                  return !!(p && p.storage && (p.storage.diy005_wuliang_seal || p.storage.diy005_wuliang_sealer));
                },
                content(event, trigger, player) {
                  const p = trigger.player;
                  p.enableSkill("diy005_wuliang_seal_reason");
                  if (p.removeSkill) p.removeSkill("diy005_wuliang_sealed");
                  delete p.storage.diy005_wuliang_seal;
                  delete p.storage.diy005_wuliang_sealer;
                }
              }
            },
            ai: {
              skill(event, player) {
                return player.storage.diy005_yan_max > 0;
              }
            }
          },
          // ===================== 无量空处·封印态（挂给「被封者」，封其响应）=====================
          // ⚠️ cardRespondable 由 checkMod(card, 响应者, …, "cardRespondable", 响应者) 查询，
          //    只查「响应者」身上的技能 → 必须挂在被封者身上才生效（挂在五条悟身上永不触发）。
          diy005_wuliang_sealed: {
            charlotte: true,
            forced: true,
            // 该技能仅作 mod 载体，由 无量空处.content 动态 addSkill 到被封者
            mod: {
              // cardRespondable(card, player, result)：player = 响应者（被封者）
              cardRespondable(card, player, result) {
                const sealer = player.storage && player.storage.diy005_wuliang_sealer;
                if (!sealer) return result;
                const evt = _status2.event;
                const src = evt && evt.getParent ? evt.getParent().player : null;
                if (src && src !== player && src.playerid === sealer) return false;
                return result;
              }
            }
          }
        },
        translate: {
          diy005_gotoh: "\u4E94\u6761\u609F",
          diy005_liuyan: "\u516D\u773C",
          "diy005_liuyan_info": "\u9501\u5B9A\u6280\uFF0C\u4F60\u521D\u59CB\u62E5\u67096\u679A\u300C\u773C\u300D\u6807\u8BB0\uFF08\u4E0A\u96506\uFF09\u3002\u5176\u4ED6\u89D2\u8272\u7684\u51FA\u724C\u9636\u6BB5\u5F00\u59CB\u65F6\uFF08\u6478\u724C\u540E\u3001\u51FA\u724C\u524D\uFF09\uFF0C\u4F60\u53EF\u6D88\u80171\u679A\u300C\u773C\u300D\u89C2\u770B\u5176\u624B\u724C\u5E76\u58F0\u660E\u4E00\u79CD\u724C\u7684\u7C7B\u578B\uFF08\u57FA\u672C\u724C\uFF0F\u9526\u56CA\u724C\uFF0F\u88C5\u5907\u724C\uFF09\uFF0C\u6BCF\u8F6E\u9650\u4E24\u6B21\uFF1B\u5F53\u8BE5\u89D2\u8272\u4E0B\u4E00\u6B21\u4F7F\u7528\u7684\u724C\u4E0E\u4F60\u58F0\u660E\u7684\u7C7B\u578B\u76F8\u540C\u65F6\uFF0C\u4F60\u4EE4\u6B64\u724C\u65E0\u6548\uFF0C\u5E76\u7ACB\u5373\u53EF\u9009\u62E9\u593A\u7528\u6B64\u724C\uFF08\u53D6\u56DE\u624B\u724C\u5E76\u4F7F\u7528\uFF09\u3002\u4F60\u8EAB\u4E0A\u4F1A\u6709\u300C\u9884\u6D4B\u300D\u6807\u8BB0\u663E\u793A\u5DF2\u58F0\u660E\u7684\u5185\u5BB9\u3002",
          diy005_wuxian: "\u65E0\u9650",
          "diy005_wuxian_info": "\u9501\u5B9A\u6280\u3002\u4F60\u7684\u56DE\u5408\u5F00\u59CB\u65F6\uFF0C\u4F60\u7684\u300C\u773C\u300D\u6807\u8BB0\u6062\u590D\u81F3\u4E0A\u9650\u3002\u5176\u4ED6\u89D2\u8272\u7684\u51FA\u724C\u9636\u6BB5\u5F00\u59CB\u65F6\uFF0C\u4F60\u53EF\u6D88\u80171\u679A\u300C\u773C\u300D\uFF1A\u672C\u56DE\u5408\u5185\uFF0C\u5F53\u4F60\u6210\u4E3A\u5176\u4ED6\u89D2\u8272\u4F7F\u7528\u3010\u6740\u3011\u7684\u76EE\u6807\u65F6\uFF0C\u82E5\u5176\u653B\u51FB\u8303\u56F4\u4E0D\u5927\u4E8E\u4F60\u5F53\u524D\u7684\u300C\u773C\u300D\u6570\u91CF\uFF0C\u6B64\u3010\u6740\u3011\u5BF9\u4F60\u65E0\u6548\u3002",
          diy005_canghe: "\u82CD\u8D6B",
          "diy005_canghe_info": "\u4E3B\u52A8\u6280\u3002\u51FA\u724C\u9636\u6BB5\u9650\u4E00\u6B21\uFF0C\u4F60\u6D88\u80171\u679A\u300C\u773C\u300D\u53EF\u9009\u62E9\u4E00\u9879\uFF1A1.\u4F9D\u6B21\u83B7\u5F97X\u540D\u5176\u4ED6\u89D2\u8272\u5404\u4E00\u5F20\u724C\uFF08\u624B\u724C\u6216\u88C5\u5907\u7686\u53EF\uFF09\uFF1B2.\u4F9D\u6B21\u4EA4\u7ED9X\u540D\u5176\u4ED6\u89D2\u8272\u5404\u4E00\u5F20\u624B\u724C\uFF08X\u4E3A\u4F60\u5F53\u524D\u300C\u773C\u300D\u7684\u6570\u91CF\uFF09\u3002\u6BCF\u540D\u5176\u4ED6\u89D2\u8272\u5728\u8BE5\u9879\u5185\u81F3\u591A\u88AB\u9009\u4E00\u6B21\uFF0C\u9009\u62E9\u4E0D\u53EF\u53D6\u6D88\uFF1B\u82E5\u4F60\u624B\u724C\u4E0D\u8DB3\u5219\u4E0D\u5FC5\u989D\u5916\u4EA4\u51FA\u3002\u82E5\u4F60\u6267\u884C\u4E86\u5176\u4E2D\u4E00\u9879\uFF0C\u4F60\u7684\u7ED3\u675F\u9636\u6BB5\u987B\u6267\u884C\u53E6\u4E00\u9879\uFF08\u540C\u6837X\u540D\u3001\u6BCF\u4EBA\u4E00\u6B21\u3001\u4E0D\u53EF\u53D6\u6D88\uFF09\u3002",
          diy005_xushi: "\u865A\u5F0F",
          "diy005_xushi_info": "\u4E3B\u52A8\u6280\u3002\u51FA\u724C\u9636\u6BB5\u9650\u4E00\u6B21\uFF0C\u4F60\u6D88\u80171\u679A\u300C\u773C\u300D\u53EF\u5C06\u624B\u724C\u6570\u8C03\u6574\u81F3\u672C\u56DE\u5408\u5185\u4F60\u7684\u624B\u724C\u6570\u66FE\u8FBE\u5230\u8FC7\u7684\u6700\u5927\u503C\u4E0E\u6700\u5C0F\u503C\u4E4B\u548C\u7684\u4E00\u534A\uFF08\u5411\u4E0A\u53D6\u6574\uFF09\uFF1B\u7136\u540E\u4F60\u672C\u56DE\u5408\u4F7F\u7528\u724C\u65E0\u8DDD\u79BB\u9650\u5236\u4E0E\u6B21\u6570\u9650\u5236\uFF08\u6843/\u88C5\u5907/\u9526\u56CA\u7B49\u4EA6\u53EF\u6B63\u5E38\u4F7F\u7528\uFF09\u3002",
          diy005_wuliang: "\u65E0\u91CF\u7A7A\u5904",
          "diy005_wuliang_info": "\u89C9\u9192\u6280\u3002\u5F53\u4F60\u8FDB\u5165\u6FD2\u6B7B\u72B6\u6001\u65F6\uFF0C\u4F60\u53EF\u4EE4\u300C\u773C\u300D\u6807\u8BB0\u4E0A\u9650\u51CF\u534A\uFF08\u5411\u4E0B\u53D6\u6574\uFF0C\u5373\u4F9D\u6B21 6\u21923\u21921\u21920\uFF09\uFF0C\u5E76\u5C06\u5F53\u524D\u7684\u300C\u773C\u300D\u6807\u8BB0\u540C\u6B65\u964D\u81F3\u65B0\u4E0A\u9650\uFF08\u4F8B\u5982\u4E0A\u96506\u21923\u3001\u5F53\u524D\u773C6\u21923\uFF09\uFF0C\u7136\u540E\u4EE4\u6240\u6709\u5176\u4ED6\u89D2\u8272\u4F9D\u6B21\u9009\u62E9\u4E00\u9879\uFF1A1.\u6478X\u5F20\u724C\uFF0C\u5176\u4E0B\u4E2A\u56DE\u5408\u5185\u975E\u9501\u5B9A\u6280\u5931\u6548\u4E14\u4E0D\u80FD\u54CD\u5E94\u4F60\u4F7F\u7528\u7684\u724C\uFF1B2.\u5931\u53BBX+1\u5F20\u724C\uFF08X\u4E3A\u4F60\u5F53\u524D\u7684\u300C\u773C\u300D\u6570\u91CF\uFF0C\u81F3\u5C11\u4E3A1\uFF09\u3002\u7136\u540E\u5C06\u4F60\u7684\u4F53\u529B\u6062\u590D\u81F3X\u70B9\uFF1B\u5F53\u524D\u89D2\u8272\u7684\u56DE\u5408\u7ED3\u675F\u65F6\uFF0C\u4F60\u6267\u884C\u4E00\u4E2A\u989D\u5916\u7684\u56DE\u5408\u3002\u6BCF\u8F6E\u5F00\u59CB\u65F6\uFF0C\u82E5\u4F60\u7684\u300C\u773C\u300D\u6807\u8BB0\u4E0A\u9650\u4E3A0\uFF0C\u4F60\u6B7B\u4EA1\u3002",
          diy005_yan: "\u773C",
          "diy005_yan_info": "\u773C\uFF1A\u4E94\u6761\u609F\u6BCF\u8F6E\u8D44\u6E90\u3002\u56DE\u5408\u5F00\u59CB\u56DE\u6EE1\u81F3\u4E0A\u9650\uFF1B\u516D\u773C/\u65E0\u9650/\u82CD\u8D6B/\u865A\u5F0F\u5404\u80171\uFF0C\u65E0\u91CF\u7A7A\u5904\u780D\u4E0A\u9650\u3002",
          diy005_wuliang_sealed: "\u65E0\u91CF\u7A7A\u5904\xB7\u5C01\u5370",
          "diy005_wuliang_sealed_info": "\uFF08\u65E0\u91CF\u7A7A\u5904\u884D\u751F\uFF09\u4F60\u4E0B\u4E2A\u56DE\u5408\u5185\u975E\u9501\u5B9A\u6280\u5931\u6548\uFF0C\u4E14\u4E0D\u80FD\u54CD\u5E94\u4E94\u6761\u609F\u4F7F\u7528\u7684\u724C\u3002",
          diy005_canghe_end: "\u82CD\u8D6B\xB7\u8865",
          "diy005_canghe_end_info": "\uFF08\u82CD\u8D6B\u884D\u751F\uFF09\u4F60\u7684\u7ED3\u675F\u9636\u6BB5\u987B\u5F3A\u5236\u6267\u884C\u53E6\u4E00\u9879\uFF08\u83B7\u5F97/\u4EA4\u7ED9\uFF09\u3002",
          diy005_liuyan_mark: "\u9884\u6D4B",
          "diy005_liuyan_mark_info": "\u516D\u773C\u9884\u6D4B\u6807\u8BB0\uFF1A\u60AC\u505C\u67E5\u770B\u4F60\u9884\u6D4B\u7684\u5404\u89D2\u8272\u4E0B\u4E00\u5F20\u724C\u578B\uFF08\u57FA\u672C\u724C\uFF0F\u9526\u56CA\u724C\uFF0F\u88C5\u5907\u724C\uFF09\u3002"
        }
      },
      intro: "v1.7\uFF1A\u5B9E\u673A 3 \u7C7B\u4FEE\u590D\u2014\u2014\u2460 \u865A\u5F0F\u300C\u65E0\u8DDD\u79BB/\u65E0\u6B21\u6570\u4E0D\u751F\u6548\u300D+\u300C\u82CD\u8D6B/\u865A\u5F0F\u6309\u94AE\u6DF7\u5728\u4E00\u8D77\u300D\uFF1A\u6839\u56E0\u4E3A\u865A\u5F0F\u7528 addTempSkill \u628A\u7EAF mod \u5B50\u6280\u80FD diy005_xushi_free \u52A0\u5165\u4E34\u65F6\u5217\u8868\uFF0C\u65E2\u6C61\u67D3\u51FA\u724C\u9636\u6BB5\u6280\u80FD\u9762\u677F\uFF08\u6309\u94AE\u9519\u4E71 bug\u2460\uFF09\uFF0C\u5176 mod \u5728 phaseUse \u5185\u53C8\u672A\u5FC5\u88AB checkMod \u6B63\u786E\u6536\u96C6\uFF08\u65E0\u8DDD\u79BB/\u65E0\u6B21\u6570\u6574\u4F53\u4E0D\u751F\u6548 bug\u2461\uFF09\u3002\u6539\u4E3A\u628A mod\uFF08globalFrom/cardUsable\uFF09\u76F4\u63A5\u6302\u5230 diy005_xushi \u672C\u4F53\uFF0C\u7528 player.storage.diy005_xushi_active \u672C\u56DE\u5408\u6807\u8BB0\u95E8\u63A7\uFF08\u6FC0\u6D3B\u7F6E true\uFF0Ctrack \u5B50\u6280\u80FD\u5728 phaseEnd \u6E05\u9664\uFF09\uFF0C\u5E76\u5220\u9664 addTempSkill \u4E0E diy005_xushi_free \u5B50\u6280\u80FD\uFF1B\u6309\u94AE\u9519\u4E71\u4E0E\u65E0\u8DDD\u79BB/\u65E0\u6B21\u6570\u540C\u65F6\u4FEE\u590D\u3002\u2461 \u65E0\u91CF\u7A7A\u5904\u300C\u773C\u4E0A\u9650\u51CF\u534A\u300D\u5E8F\u5217\u4FEE\u6B63\uFF1A\u7528\u6237\u6587\u6848\u5199\u300C\u5411\u4E0A\u53D6\u6574\u300D\u4F46\u793A\u4F8B\u5E8F\u5217\u4E3A 6\u21923\u21921\u21920\uFF08\u7B2C\u4E00\u6B21\u52693/\u7B2C\u4E8C\u6B21\u52691/\u7B2C\u4E09\u6B21\u52690\uFF09\uFF0C\u8BE5\u5E8F\u5217\u7B49\u4EF7\u4E8E\u5411\u4E0B\u53D6\u6574\uFF0C\u6545\u5C06 Math.ceil \u6539\u4E3A Math.floor\uFF0C\u5F97\u5230 6\u21923\u21921\u21920\uFF08\u4E0E\u793A\u4F8B\u4E00\u81F4\uFF1B\u65E7 ceil \u4E3A 6\u21923\u21922\u21921\uFF09\u3002v1.6\uFF1A\u5B9E\u673A 2 \u7C7B\u4FEE\u590D\u2014\u2014\u2460 \u865A\u5F0F\u300C\u65E0\u6CD5\u4F7F\u7528\u6843/\u88C5\u5907/\u9526\u56CA\u300D\uFF1A\u6839\u56E0\u4E3A\u865A\u5F0F\u4E34\u65F6\u6280\u80FD diy005_xushi_free \u7684 mod.cardUsable \u5199\u6210 num+100\uFF0C\u800C\u6843/\u88C5\u5907/\u9526\u56CA\u7B49\u57FA\u7840 usable \u4E3A undefined\uFF0Cundefined+100=NaN\uFF1Blib.filter.cardUsable \u4E2D countUsed<num \u6052\u4E3A false \u2192 \u8FD9\u4E9B\u724C\u53CD\u800C\u53D8\u300C\u4E0D\u53EF\u4F7F\u7528\u300D\uFF08\u4EC5\u6740 usable=1 \u5E78\u5B58\uFF09\u3002\u6539\u4E3A\uFF1A\u57FA\u7840\u6709\u9650\u5219 num+100\uFF0C\u57FA\u7840\u672A\u5B9A\u4E49\u5219\u76F4\u63A5\u8FD4\u56DE Infinity\uFF08\u4FDD\u6301\u65E0\u9650\u53EF\u7528\uFF09\u3002\u2461 \u82CD\u8D6B\u91CD\u5199\uFF08\u6309\u65B0\u6587\u6848\uFF09\uFF1AX=\u5F53\u524D\u773C\u6570\uFF08\u4E0D\u5C01\u9876\u3001\u5FAA\u73AF\u6309\u5B9E\u9645\u53EF\u9009\u4EBA\u6570\u53BB\u91CD\uFF09\uFF1B\u83B7\u5F97\u9879\u6539\u4E3A\u300C\u5404\u4E00\u5F20\u724C\u300D\uFF08\u624B\u724C\u6216\u88C5\u5907\uFF0CgainPlayerCard \u7528 he \u4F4D\uFF09\uFF1B\u4EA4\u7ED9\u9879\u4ECD\u4E3A\u300C\u5404\u4E00\u5F20\u624B\u724C\u300D\uFF1B\u6BCF\u540D\u5176\u4ED6\u89D2\u8272\u5728\u8BE5\u9879\u5185\u81F3\u591A\u4E00\u6B21\uFF08filterTarget \u6392\u9664\u5DF2\u9009 + used \u96C6\u5408\uFF09\uFF1B\u9009\u4EBA chooseTarget/\u4EA4\u7ED9 chooseToGive \u5747 forced:true \u9632\u53D6\u6D88\uFF1B\u624B\u724C\u4E0D\u8DB3\u5219\u63D0\u524D\u505C\uFF08\u4E0D\u5FC5\u989D\u5916\u4EA4\uFF09\uFF1B\u7ED3\u675F\u9636\u6BB5 diy005_canghe_end \u590D\u7528\u540C\u4E00\u6267\u884C\u5668\u5E76\u53D6\u6FC0\u6D3B\u65F6\u8BB0\u5F55\u7684 X\uFF0C\u6545\u7ED3\u675F\u4E5F\u5BF9 X \u540D\u5404\u6267\u884C\u4E00\u6B21\uFF08\u4FEE\u65E7\u7248\u300C\u7ED3\u675F\u53EA1\u4EBA\u300D\uFF09\u3002v1.5\uFF1A\u5B9E\u673A 2 \u9879\u4FEE\u590D\u2014\u2014\u2460 \u516D\u773C\u593A\u7528\u4E0D\u5F39\u7A97\uFF1A\u6839\u56E0\u4E3A\u88AB\u53D6\u6D88\u7684\u724C\u8D70 card.discard() \u5E95\u5C42 UI \u79FB\u52A8\uFF0C\u7EDD\u4E0D\u89E6\u53D1 discardAfter \u5168\u5C40\u4E8B\u4EF6\uFF0C\u539F claim \u5B50\u6280\u80FD\uFF08\u76D1\u542C discardAfter\uFF09\u6C38\u8FDC\u4E0D\u53D1\u52A8\uFF1B\u6539\u4E3A\u5728 counter \u53D6\u6D88\u724C\u7684\u5F53\u4E0B\u540C\u6B65\u8BE2\u95EE\u4E94\u6761\u609F\u300C\u662F\u5426\u593A\u7528\u300D\u5E76 gain+chooseUseTarget\uFF08\u593A\u7528\u673A\u5236\u5DF2\u5185\u8054\uFF0C\u4E0D\u518D\u4F9D\u8D56\u5F03\u724C\u5806\uFF09\u3002\u2461 \u65E0\u9650\u8303\u56F4\u95EA\u6740\u4E0D\u6321\uFF1A\u6839\u56E0\u4E3A useCardToTarget \u7684 trigger.cancel() \u4E0D\u4F1A\u628A\u76EE\u6807\u79FB\u51FA\u4E8B\u4EF6\uFF0C\u3010\u6740\u3011\u4ECD\u4F1A\u547D\u4E2D\uFF1B\u6539\u4E3A\u663E\u5F0F trigger.getParent().excluded.add(player)\uFF08\u53C2\u7167\u5F15\u64CE huan_duocai_target \u8303\u4F8B\uFF09\uFF0C\u4EE4\u8BE5\u3010\u6740\u3011\u5BF9\u4E94\u6761\u609F\u65E0\u6548\u3002v1.4\uFF1A\u5B9E\u673A\u53CD\u9988 3 \u9879\u2014\u2014\u2460 \u82CD\u8D6B\u300C\u7ED3\u675F\u9636\u6BB5\u987B\u6267\u884C\u53E6\u4E00\u9879\u300D\u672A\u89E6\u53D1\uFF1A\u6839\u56E0\u4E3A v1.3 \u628A\u82CD\u8D6B\xB7\u8865\uFF08diy005_canghe_end\uFF09\u62C6\u4E3A\u9876\u5C42\u6280\u80FD\u5374\u672A\u6302\u56DE\u6B66\u5C06 skills \u6570\u7EC4\uFF0C\u4E94\u6761\u609F\u4E0D\u300C\u62E5\u6709\u300D\u5B83\u6545 phaseJieshuBegin \u6C38\u4E0D\u52A8\uFF1B\u5DF2\u52A0\u5165 char.skills\uFF08forced:true \u4ECD\u4E0D\u5F39\u6309\u94AE\uFF09\u3002\u2461 \u65E0\u91CF\u7A7A\u5904\u300C\u773C\u4E0A\u9650\u51CF\u534A\u300D\u540E\u5F53\u524D\u773C\u6807\u8BB0\u4ECD 6\uFF1A\u6839\u56E0\u4E3A\u53EA\u964D diy005_yan_max \u672A\u540C\u6B65\u5F53\u524D\u503C\uFF1B\u5DF2\u5728\u51CF\u534A\u540E setMark \u628A\u5F53\u524D\u773C\u94B3\u5230 min(\u5F53\u524D,\u65B0\u4E0A\u9650)\uFF086\u21923\uFF09\u3002\u2462 \u516D\u773C\u593A\u53D6\u673A\u5236\u5DF2\u5411\u7528\u6237\u8BF4\u660E\u5E76\u9644\u89E6\u53D1\u673A\u5236\u56FE\u3002",
      author: "\u4F60\u7684\u540D\u5B57",
      diskURL: "",
      forumURL: "",
      version: "1.7"
    },
    files: { character: [], card: [], skill: [], audio: [] }
  };
}

// ../_workbuddy_tmp/v41_build/m06.js
import { lib, game as game5, ui as ui2, get as get6, _status as _status3 } from "noname";
var PAO_KEY = "diy006_pao";
var PAO_NODE = "diy006_pao_node";
var PAO_INFO = {
  name: "\u6D6E\u6CE1",
  content: "\u6D6E\u6CE1\uFF1A\u9632\u6B621\u70B9\u4F24\u5BB3\uFF1B\u7834\u788E\u540E\u8BE5\u89D2\u8272\u4E0E\u9065\u5404\u64781\u724C\uFF0C\u5E76\u4F20\u64AD\u7ED9\u4F60\u6307\u5B9A\u7684\u53E6\u4E00\u540D\u6CA1\u6709\u6D6E\u6CE1\u7684\u89D2\u8272\u3002",
  // 浮泡是「有无」型标记（每名角色至多 1 个），不显示数量角标，外观更贴近原生的单字标记
  nocount: true
};
function pickTarget(r) {
  if (!r) return null;
  if (r.target) return r.target;
  if (Array.isArray(r.targets) && r.targets.length > 0) return r.targets[0];
  return null;
}
function removePaoNode(target) {
  if (!target || !target.node) return;
  const node = target.node[PAO_NODE];
  if (node) {
    if (typeof node.delete === "function") node.delete();
    else if (node.remove) node.remove();
    delete target.node[PAO_NODE];
    try {
      ui2.updatem(target);
    } catch (e) {
    }
  }
}
function ensurePaoNode(target) {
  if (!target) return;
  removePaoNode(target);
  try {
    target.markSkill(PAO_KEY, PAO_INFO);
  } catch (e) {
  }
  const node = target.marks && target.marks[PAO_KEY];
  if (!node || !node.style) return;
  const bg = node.querySelector(".background") || node.firstChild;
  if (bg && bg.style) {
    bg.style.display = "block";
    bg.style.padding = "0";
    bg.style.fontSize = "10px";
    bg.style.lineHeight = "20px";
    bg.style.letterSpacing = "0";
    bg.style.textAlign = "center";
    bg.style.whiteSpace = "nowrap";
  }
  try {
    ui2.updatem(target);
    node.classList.remove("drawinghidden");
    node.style.opacity = "1";
  } catch (e) {
  }
}
function grantPao(target) {
  if (!target) return;
  target.storage[PAO_KEY] = (target.storage[PAO_KEY] || 0) + 1;
  try {
    game5.log(target, "\u83B7\u5F97\u4E86", "1 \u4E2A", "#g\u3010" + PAO_INFO.name + "\u3011");
  } catch (e) {
  }
  ensurePaoNode(target);
}
function dropPao(target, num = 1) {
  if (!target) return;
  const next = Math.max(0, (target.storage[PAO_KEY] || 0) - num);
  if (next > 0) {
    target.storage[PAO_KEY] = next;
    ensurePaoNode(target);
  } else {
    delete target.storage[PAO_KEY];
    removePaoNode(target);
    try {
      target.unmarkSkill(PAO_KEY);
    } catch (e) {
    }
  }
}
function index_default6() {
  return {
    name: "diy006_yao",
    author: "\u4F60\u7684\u540D\u5B57",
    version: "1.13.1",
    connect: false,
    editable: false,
    content() {
      lib.skill.diy006_pao = Object.assign({}, lib.skill.diy006_pao, {
        mark: true,
        marktext: "\u6D6E\u6CE1",
        intro: PAO_INFO
      });
      lib.translate.diy006_pao = lib.translate.diy006_pao || "\u6D6E\u6CE1";
      lib.translate["diy006_pao_bg"] = lib.translate["diy006_pao_bg"] || "\u6D6E\u6CE1";
    },
    package: {
      character: {
        character: {
          diy006_yao: {
            sex: "female",
            group: "qun",
            // 群势力（设计裁定）
            hp: 4,
            maxHp: 4,
            skills: ["diy006_fuguang", "diy006_paoying", "diy006_huiyao"],
            names: "\u9065",
            // 立绘：扩展内图片须走 extension/ 前缀
            img: "extension/diy006_yao/image/character/diy006_yao.jpg"
          }
        },
        translate: { diy006_yao: "\u9065" }
      },
      skill: {
        skill: {
          // ============ 浮泡（可见标记）============
          // 这里保留静态注册只为「信息面板 / 日志文案 / 其它技能查询」，标记节点本身
          // 由 grantPao → ensurePaoNode 自建（见文件头部说明：layout 会把
          // `.marks > div > div:not(.image)` 全部 display:none，引擎自带的标记文字层看不见）。
          diy006_pao: {
            mark: true,
            marktext: "\u6D6E\u6CE1",
            intro: {
              name: "\u6D6E\u6CE1",
              content: "\u6D6E\u6CE1\uFF1A\u9632\u6B621\u70B9\u4F24\u5BB3\uFF1B\u7834\u788E\u540E\u8BE5\u89D2\u8272\u4E0E\u9065\u5404\u64781\u724C\uFF0C\u5E76\u4F20\u64AD\u7ED9\u4F60\u6307\u5B9A\u7684\u53E6\u4E00\u540D\u6CA1\u6709\u6D6E\u6CE1\u7684\u89D2\u8272\u3002",
              // 有无型标记，不画数量角标（float 只有 0/1）
              nocount: true
            }
          },
          // ===================== 浮光（锁定技 · 浮泡网 + 破碎双方摸牌 + 传播 + 回合末收敛）=====================
          diy006_fuguang: {
            charlotte: true,
            // 锁定技
            init(player) {
              player.storage.diy006_huiyao_round = -1;
              [
                "diy006_fuguang_begin",
                "diy006_fuguang_shield",
                "diy006_fuguang_end",
                "diy006_paoying_reset",
                "diy006_huiyao_heal",
                "diy006_huiyao_fulong"
              ].forEach((s) => player.addSkillTrigger(s));
            },
            group: ["diy006_fuguang_begin", "diy006_fuguang_shield", "diy006_fuguang_end"],
            subSkill: {
              // —— ① 回合开始给浮泡（由你指定，任意其他角色）——
              // 〔v1.7铁律〕用 global + filter(event.player===player)，避免 player 角色触发不生效。
              begin: {
                trigger: { global: "phaseBegin" },
                // 每回合开始都触发，filter 限定遥自身
                filter(event, player) {
                  return event.player === player || _status3.currentPhase === player;
                },
                forced: true,
                charlotte: true,
                async content(event, trigger, player) {
                  const hasTarget = game5.filterPlayer(
                    (p) => p !== player && p.isAlive() && p.countMark("diy006_pao") <= 0
                  ).length;
                  if (hasTarget) {
                    const r = await player.chooseTarget({
                      prompt: "\u6D6E\u5149\uFF1A\u4EE4\u8C01\u83B7\u5F97\u4E00\u4E2A\u6D6E\u6CE1\uFF1F",
                      filterTarget: (card, p, target) => target !== p && target.isAlive() && target.countMark("diy006_pao") <= 0,
                      forced: false
                    }).forResult();
                    const t = pickTarget(r);
                    if (t) grantPao(t);
                  }
                }
              },
              // —— ② 带泡角色受伤：防止1点 + 移除浮泡 + 该角色摸1 + 传播；③ 遥摸1 ——
              shield: {
                trigger: { global: "damageBegin4" },
                // 减免阶段（B4）
                forced: true,
                charlotte: true,
                filter(event, player) {
                  const v = event.player;
                  return v && v.countMark("diy006_pao") > 0 && event.num > 0;
                },
                async content(event, trigger, player) {
                  const v = trigger.player;
                  trigger.num = Math.max(0, trigger.num - 1);
                  dropPao(v);
                  await v.draw(1);
                  player.draw(1);
                  const rc = await player.chooseTarget({
                    prompt: "\u6D6E\u5149\uFF1A\u4EE4\u8C01\u83B7\u5F97\u4E00\u4E2A\u6D6E\u6CE1\uFF1F",
                    filterTarget: (card, p, target) => target !== p && target !== v && target.isAlive() && target.countMark("diy006_pao") <= 0,
                    forced: false
                  }).forResult();
                  const next = pickTarget(rc);
                  if (next) grantPao(next);
                }
              },
              // —— ④ 回合结束：场上≥2 有泡角色 → 移除至仅剩一个（选择保留哪一名）——
              end: {
                trigger: { global: "phaseJieshuBegin" },
                // 每回合结束都触发，filter 限定遥自身
                filter(event, player) {
                  if (event.player !== player && _status3.currentPhase !== player) return false;
                  const n = game5.filterPlayer(
                    (p) => p.isAlive() && p.countMark("diy006_pao") > 0
                  ).length;
                  return n >= 2;
                },
                forced: true,
                charlotte: true,
                async content(event, trigger, player) {
                  const holders = game5.filterPlayer(
                    (p) => p.isAlive() && p.countMark("diy006_pao") > 0
                  );
                  const r = await player.chooseTarget({
                    prompt: "\u6D6E\u5149\uFF1A\u9009\u62E9\u4FDD\u7559\u54EA\u4E00\u4E2A\u6D6E\u6CE1\uFF1F\uFF08\u5176\u4F59\u6709\u6CE1\u8005\u7684\u6D6E\u6CE1\u5C06\u88AB\u79FB\u9664\uFF09",
                    filterTarget: (card, p, target) => holders.includes(target),
                    forced: true
                    // 必须选一个保留
                  }).forResult();
                  const keep = pickTarget(r);
                  for (const h of holders) {
                    if (h !== keep) dropPao(h);
                  }
                }
              }
            }
          },
          // ===================== 泡影（主动技 · 出牌阶段限一次 · 弃2牌治疗+给2人浮泡）=====================
          // 〔v1.8重构〕移除「造成1点伤害」分支与「第2次后减伤」机制；
          // 改为「出牌阶段限一次」：弃2牌 → 令一名已受伤的其他角色回1血，并令其及另一名其他角色获得浮泡。
          diy006_paoying: {
            enable: "phaseUse",
            // 出牌阶段主动发动
            // 〔v1.9〕不用引擎 usable（它在“发动”时就扣次，取消也会被算一次）；
            //   改为手动标记 diy006_paoying_used —— 只有完整执行完才置 true，
            //   中途取消不置 true，可继续使用，直到完整执行完才失效。
            filter(event, player) {
              return player.countCards("h") >= 2 && !player.storage.diy006_paoying_used;
            },
            async content(event, trigger, player) {
              const r = await player.chooseTarget({
                prompt: "\u6CE1\u5F71\uFF1A\u4EE4\u54EA\u540D\u5176\u4ED6\u89D2\u8272\u56DE\u590D1\u70B9\u4F53\u529B\uFF1F",
                filterTarget: (card, p, target) => target !== p && target.isAlive(),
                forced: false
              }).forResult();
              const ally = pickTarget(r);
              if (!ally) return;
              await player.chooseToDiscard(2, true);
              await ally.recover(1);
              grantPao(ally);
              const hasAnother = game5.filterPlayer(
                (p) => p !== player && p !== ally && p.isAlive() && p.countMark("diy006_pao") <= 0
              ).length;
              if (hasAnother) {
                const r2 = await player.chooseTarget({
                  prompt: "\u6CE1\u5F71\uFF1A\u518D\u4EE4\u8C01\uFF08\u4E0E\u524D\u8005\u4E00\u5E76\uFF09\u83B7\u5F97\u6D6E\u6CE1\uFF1F",
                  filterTarget: (card, p, target) => target !== p && target !== ally && target.isAlive() && target.countMark("diy006_pao") <= 0,
                  forced: true
                  // 不可取消
                }).forResult();
                const other = pickTarget(r2);
                if (other) grantPao(other);
              } else {
                game5.log("\u573A\u4E0A\u6CA1\u6709\u7B2C\u4E8C\u540D\u53EF\u9009\u89D2\u8272\uFF0C\u4EC5", ally, "\u83B7\u5F97\u6D6E\u6CE1");
              }
              player.storage.diy006_paoying_used = true;
            },
            // 每个出牌阶段开始时重置（仅遥自己的出牌阶段）
            group: ["diy006_paoying_reset"],
            subSkill: {
              reset: {
                trigger: { global: "phaseUseBegin" },
                filter(event, player) {
                  return event.player === player || _status3.currentPhase === player;
                },
                forced: true,
                charlotte: true,
                content(event, trigger, player) {
                  player.storage.diy006_paoying_used = false;
                }
              }
            },
            ai: {
              order: 9,
              result: { player: 1 },
              // 能弃 2 牌、且未用过、场上有其他存活角色才发动
              skill(event, player) {
                if (player.countCards("h") < 2) return 0;
                if (player.storage.diy006_paoying_used) return 0;
                const target = game5.filterPlayer((p) => p !== player && p.isAlive()).length;
                return target ? 1 : 0;
              }
            }
          },
          // ===================== 辉耀（限定技 · 每轮开始可发动 · 本轮内回血+1 + 浮空禁杀）=====================
          diy006_huiyao: {
            // 限定技，每轮开始时你可发动。发动后「本轮内」：
            // ① 你回复的体力 +1；② 当一名其他角色对带浮泡角色造成伤害时，该角色其回合内不能使用【杀】。
            // 用 global roundStart（每轮开始都触发）；limited:true 保证整局仅发动一次。
            // 非 forced → 限定技未用前每轮开始弹出「是否发动」，发动后封禁。
            trigger: { global: "roundStart" },
            limited: true,
            // 限定技（整局一次）
            async content(event, trigger, player) {
              player.storage.diy006_huiyao_round = game5.roundNumber;
            },
            group: ["diy006_huiyao_heal", "diy006_huiyao_fulong"],
            subSkill: {
              heal: {
                // 遥回复体力 +1（本轮内）；用 global recover + filter(event.player===player)
                trigger: { global: "recover" },
                // recover 事件名合法
                forced: true,
                charlotte: true,
                filter(event, player) {
                  return player.storage.diy006_huiyao_round === game5.roundNumber && event.player === player;
                },
                content(event, trigger, player) {
                  trigger.num = (trigger.num || 0) + 1;
                }
              },
              fulong: {
                // 任意其他角色（不再限敌方）对带浮泡角色造成伤害 → 该角色其回合内不能使用【杀】
                trigger: { global: "damageBegin" },
                // 前缀匹配覆盖 damageBegin1~4
                forced: true,
                charlotte: true,
                filter(event, player) {
                  const v = event.player, src = event.source;
                  if (!v || !src || src === player) return false;
                  if (v.countMark("diy006_pao") <= 0) return false;
                  return player.storage.diy006_huiyao_round === game5.roundNumber;
                },
                async content(event, trigger, player) {
                  const src = trigger.source;
                  src.addTempSkill("diy006_fulong_seal", { player: "phaseEnd" });
                }
              }
            },
            ai: {
              // 遥未满血（回血有用）或场上有带泡角色可能被伤时发动
              skill(event, player) {
                if (player.hp < player.maxHp) return 1;
                const hasPao = game5.filterPlayer(
                  (p) => p.isAlive() && p !== player && p.countMark("diy006_pao") > 0
                ).length;
                return hasPao ? 1 : 0;
              }
            }
          },
          // ===================== 浮空封杀（独立临时技能 · 被惩罚者本回合不能使用【杀】）=====================
          diy006_fulong_seal: {
            charlotte: true,
            mod: {
              // cardEnabled 返回 false 即禁用该牌（huicui 实证）
              cardEnabled(card, player) {
                if (get6.name(card) == "sha") return false;
                return true;
              }
            }
          }
        },
        translate: {
          diy006_yao: "\u9065",
          diy006_fuguang: "\u6D6E\u5149",
          "diy006_fuguang_info": "\u9501\u5B9A\u6280\uFF0C\u2460\u4F60\u7684\u56DE\u5408\u5F00\u59CB\u65F6\uFF0C\u4F60\u4EE4\u4E00\u540D\u6CA1\u6709\u300C\u6D6E\u6CE1\u300D\u7684\u5176\u4ED6\u89D2\u8272\u83B7\u5F97\u300C\u6D6E\u6CE1\u300D\u3002\u2461\u4E00\u540D\u89D2\u8272\u53D7\u5230\u4F24\u5BB3\u65F6\uFF0C\u82E5\u5176\u6709\u300C\u6D6E\u6CE1\u300D\uFF0C\u4F60\u9632\u6B621\u70B9\u4F24\u5BB3\u5E76\u79FB\u9664\u300C\u6D6E\u6CE1\u300D\uFF1B\u79FB\u9664\u540E\u8BE5\u89D2\u8272\u6478\u4E00\u5F20\u724C\uFF0C\u5E76\u7ACB\u5373\u4EE4\u4E00\u540D\u5176\u4ED6\u6CA1\u6709\u300C\u6D6E\u6CE1\u300D\u7684\u89D2\u8272\u83B7\u5F97\u300C\u6D6E\u6CE1\u300D\u3002\u2462\u82E5\u4EE5\u6B64\u6CD5\u79FB\u9664\u4E86\u300C\u6D6E\u6CE1\u300D\uFF0C\u4F60\u6478\u4E00\u5F20\u724C\u3002\u2463\u4F60\u7684\u56DE\u5408\u7ED3\u675F\u540E\uFF0C\u573A\u4E0A\u82E5\u5B58\u5728\u4E24\u4E2A\u53CA\u4EE5\u4E0A\u7684\u6709\u300C\u6D6E\u6CE1\u300D\u7684\u89D2\u8272\uFF0C\u4F60\u9700\u79FB\u9664\u76F4\u81F3\u53EA\u5269\u4E00\u4E2A\u3002",
          diy006_paoying: "\u6CE1\u5F71",
          "diy006_paoying_info": "\u4E3B\u52A8\u6280\uFF0C\u51FA\u724C\u9636\u6BB5\u9650\u4E00\u6B21\uFF0C\u4F60\u53EF\u5F03\u7F6E\u4E24\u5F20\u724C\uFF0C\u4EE4\u4E00\u540D\u5DF2\u53D7\u4F24\u7684\u5176\u4ED6\u89D2\u8272\u56DE\u590D1\u70B9\u4F53\u529B\uFF0C\u5E76\u4EE4\u5176\u53CA\u53E6\u4E00\u540D\u5176\u4ED6\u89D2\u8272\u83B7\u5F97\u300C\u6D6E\u6CE1\u300D\u3002",
          diy006_huiyao: "\u8F89\u8000",
          "diy006_huiyao_info": "\u9650\u5B9A\u6280\uFF0C\u6BCF\u8F6E\u5F00\u59CB\u65F6\u4F60\u53EF\u53D1\u52A8\u3002\u53D1\u52A8\u540E\u672C\u8F6E\u5185\uFF1A\u4F60\u56DE\u590D\u7684\u4F53\u529B+1\uFF1B\u5F53\u4E00\u540D\u5176\u4ED6\u89D2\u8272\u5BF9\u5E26\u6709\u300C\u6D6E\u6CE1\u300D\u7684\u89D2\u8272\u9020\u6210\u4F24\u5BB3\u65F6\uFF0C\u4F60\u4EE4\u8BE5\u89D2\u8272\u5176\u56DE\u5408\u5185\u4E0D\u80FD\u4F7F\u7528\u3010\u6740\u3011\u3002",
          // 浮泡 标记
          diy006_pao: "\u6D6E\u6CE1",
          // ★ 角色牌上标记节点显示的文案取自 lib.translate[name + "_bg"]；
          //   没有这个键时引擎会退化成 get.translation(name)[0] —— 只显示「浮」一个字。
          "diy006_pao_bg": "\u6D6E\u6CE1",
          "diy006_pao_info": "\u6D6E\u6CE1\uFF1A\u9632\u6B621\u70B9\u4F24\u5BB3\uFF1B\u7834\u788E\u540E\u8BE5\u89D2\u8272\u64781\u724C\uFF0C\u9065\u64781\u724C\uFF0C\u5E76\u4F20\u64AD\u7ED9\u4F60\u6307\u5B9A\u7684\u53E6\u4E00\u540D\u6CA1\u6709\u6D6E\u6CE1\u7684\u89D2\u8272\uFF1B\u56DE\u5408\u7ED3\u675F\u540E\u573A\u4E0A\u22652\u6709\u6CE1\u8005\u65F6\u9065\u79FB\u9664\u81F3\u4EC5\u5269\u4E00\u4E2A\u3002"
        }
      },
      intro: "\u3014v1.13.1\u3015\u6D6E\u6CE1\u6807\u8BB0\u6539\u56DE\u5F15\u64CE\u539F\u751F\u8282\u70B9\uFF08markSkill\uFF09\uFF0C\u53EA\u628A\u88AB layout.css \u9690\u85CF\u7684\u6587\u5B57\u5C42\u653E\u5F00\u663E\u793A\uFF0C\u5916\u89C2\u4E0E\u5176\u5B83\u6280\u80FD\u6807\u8BB0\u5B8C\u5168\u4E00\u81F4\uFF1B\u4E0D\u518D\u81EA\u7ED8\u84DD\u5E95\u5706\u724C\u3002\u2605v1.13 \u771F\u51F6\uFF1AchooseTarget().forResult() \u53EA\u8FD4\u56DE targets \u6570\u7EC4\u3001\u6CA1\u6709 .target \u5B57\u6BB5\uFF0C\u65E7\u4EE3\u7801 5 \u5904 r.target \u6052 undefined \u2192 \u2460\u4ECE\u4E0D\u7ED9\u6CE1\u3001\u6CE1\u5F71\u9009\u5B8C\u4EBA\u76F4\u63A5 return\u3002\u2605\u2605\u771F\u51F6\uFF08\u7B2C 7 \u6B21\u6392\u67E5\u3001\u4E5F\u662F\u552F\u4E00\u771F\u6B63\u7684\u6839\u56E0\uFF09\uFF1AchooseTarget().forResult() \u8FD4\u56DE\u7684\u662F `{ bool, targets: [Player...] }`\uFF0C**\u6CA1\u6709 `.target` \u5B57\u6BB5**\uFF08\u5F15\u64CE content.ts:7967 \u5C31\u662F `for (const target of event.result.targets)`\uFF09\u3002\u672C\u6269\u5C55 5 \u5904\u90FD\u5199\u6210 `r && r.target` \u2192 \u6052\u4E3A undefined\uFF0C\u5BFC\u81F4\uFF1A\u2460\u56DE\u5408\u5F00\u59CB `t` \u4E3A\u7A7A\u4ECE\u4E0D\u7ED9\u6CE1\uFF1B\u6CE1\u5F71\u7B2C\u4E00\u6BB5 `ally` \u4E3A\u7A7A\u76F4\u63A5 return\uFF08\u9009\u5B8C\u4EBA\u6BEB\u65E0\u53CD\u5E94\uFF09\uFF1B\u7B2C\u4E8C\u6BB5/\u4F20\u64AD/\u56DE\u5408\u672B\u6536\u655B\u540C\u6837\u5931\u6548\u3002\u6240\u4EE5\u524D\u51E0\u7248\u65E0\u8BBA\u600E\u4E48\u6539\u6807\u8BB0\u6E32\u67D3\u90FD\u770B\u4E0D\u5230\u4E1C\u897F\u2014\u2014grantPao \u6839\u672C\u6CA1\u88AB\u8C03\u7528\u8FC7\u3002v1.13 \u7EDF\u4E00\u6539\u7528 pickTarget(result) \u53D6\u503C\uFF08targets[0]\uFF0C\u517C\u5BB9 target\uFF09\u3002v1.12\uFF1Alayout.css \u6709 `.marks > div > div:not(.image){display:none}` \u4F1A\u9690\u85CF\u6807\u8BB0\u6587\u5B57\u5C42\uFF0C\u6545\u6D6E\u6CE1\u4ECD\u662F\u81EA\u5EFA\u8282\u70B9\uFF08.card.mark + \u5185\u8054 flex \u5C45\u4E2D\u7684\u300C\u6D6E\u6CE1\u300D\u6587\u5B57\uFF09\uFF0C\u4E0D\u5199\u5165 player.marks\u3002\u6D6E\u5149\uFF08\u9501\u5B9A\uFF09\uFF1A\u2460\u56DE\u5408\u5F00\u59CB\u7ED91\u540D\u65E0\u6CE1\u5176\u4ED6\u89D2\u8272\u6D6E\u6CE1\uFF1B\u2461\u4EFB\u610F\u5E26\u6CE1\u89D2\u8272\u53D7\u4F24\u65F6\u96321+\u79FB\u9664\u8BE5\u6CE1\u3001\u8BE5\u89D2\u8272\u64781\u3001\u7ACB\u5373\u4EE4\u53E6\u4E00\u540D\u65E0\u6CE1\u89D2\u8272\u5F97\u6CE1\uFF1B\u2462\u4EE5\u6B64\u6CD5\u79FB\u9664\u6CE1\u5219\u9065\u64781\uFF1B\u2463\u56DE\u5408\u7ED3\u675F\u573A\u4E0A\u22652\u6709\u6CE1\u8005\u65F6\u9065\u987B\u79FB\u9664\u81F3\u4EC5\u5269\u4E00\u4E2A\u3002\u6CE1\u5F71\uFF08\u4E3B\u52A8\xB7\u51FA\u724C\u9636\u6BB5\u9650\u4E00\u6B21\uFF09\uFF1A\u5F032\u724C\uFF0C\u4EE4\u4E00\u540D\u5176\u4ED6\u89D2\u8272\uFF08\u6EE1\u8840\u4E5F\u53EF\u9009\uFF09\u56DE1\u8840\uFF0C\u5E76\u4EE4\u5176\u53CA\u53E6\u4E00\u540D\u5176\u4ED6\u89D2\u8272\u5F97\u6D6E\u6CE1\u3002\u2605\u53D6\u6D88\u4E0D\u6263\u6B21\uFF1A\u4E0D\u7528\u5F15\u64CE usable\uFF0C\u6539\u624B\u52A8 `diy006_paoying_used`\u2014\u2014\u53EA\u6709\u5B8C\u6574\u6267\u884C\u5B8C\u624D\u7F6E true\uFF0C\u4E2D\u9014\u53D6\u6D88\u53EF\u7EE7\u7EED\u4F7F\u7528\uFF1B\u6BCF\u51FA\u724C\u9636\u6BB5\u5F00\u59CB\u91CD\u7F6E\u3002\u8F89\u8000\uFF08\u9650\u5B9A\xB7\u6BCF\u8F6E\u5F00\u59CB\u53EF\u53D1\u52A8\uFF09\uFF1A\u53D1\u52A8\u540E\u672C\u8F6E\u5185\u9065\u56DE\u8840+1\uFF1B\u4EFB\u610F\u5176\u4ED6\u89D2\u8272\u5BF9\u5E26\u6CE1\u89D2\u8272\u9020\u6210\u4F24\u5BB3\u65F6\u8BE5\u89D2\u8272\u5176\u56DE\u5408\u5185\u4E0D\u80FD\u4F7F\u7528\u3010\u6740\u3011\u3002\u3014v1.12\u3015\u6807\u8BB0\u81EA\u5EFA\u8282\u70B9+\u5185\u8054\u663E\u793A\u3002\u3014v1.11\u3015markSkill \u4F20 info\u3002\u3014v1.9\u3015`player.alive`\u2192`isAlive()`\u3002\u3014v1.8\u3015\u6309\u65B0\u6587\u672C\u91CD\u6784\u3002\u3014v1.7\u3015\u2460 global phaseBegin\u3002\u3014v1.6\u3015\u2460 subSkill \u5316\u3002\u3014v1.1\u3015subSkill \u6CE8\u518C\u3002",
      author: "\u4F60\u7684\u540D\u5B57",
      diskURL: "",
      forumURL: "",
      version: "1.13.1"
    },
    files: { character: [], card: [], skill: [], audio: [] }
  };
}

// ../_workbuddy_tmp/v41_build/m07.js
import { get as get7, _status as _status4 } from "noname";
function diy012_isEligible(card) {
  if (!card) return false;
  const t = get7.type(card);
  if (t === "basic") return true;
  if (t === "trick" && get7.subtype(card) !== "delay") return true;
  return false;
}
function diy012_X(player) {
  return Math.max(0, player.maxHp - player.hp);
}
function index_default7() {
  return {
    name: "diy012_urbian",
    author: "\u4F60\u7684\u540D\u5B57",
    version: "1.5",
    connect: false,
    editable: false,
    content() {
    },
    package: {
      character: {
        character: {
          diy012_urbian: {
            sex: "male",
            group: "qun",
            // 群势力（〔待确认〕⑨ 群/魏，按文档推荐群）
            hp: 3,
            maxHp: 4,
            // 当前体力 3 / 体力上限 4
            skills: ["diy012_xuemai", "diy012_jianshou", "diy012_jiejian"],
            names: "\u4E4C\u5C14\u6BD4\u5B89",
            // ⚠️ 屏上将名用 names 字段，不用 translate
            // 立绘：扩展内图片须走 extension/ 前缀；当前无立绘，留占位
            img: "extension/diy012_urbian/image/character/diy012_urbian.jpg"
          }
        },
        translate: { diy012_urbian: "\u4E4C\u5C14\u6BD4\u5B89" }
      },
      skill: {
        skill: {
          // ===================== 血脉（锁定技 · 按点过牌，含上限变化）=====================
          // 自己 hp / 上限每变化 1 点 → 摸 1 牌（按 |Δ|）；伤害/回血/失血/界限+上限/坚守-上限均触发
          diy012_xuemai: {
            charlotte: true,
            // 锁定技
            forced: true,
            // 〔修正 v1.2〕血脉抽牌引擎：hp 变化走 changeHp（content.ts:12370 触发，
            // 本技能 changeHp 触发正常）；但本体外 gainMaxHp/loseMaxHp 的 content
            // 不触发技能事件（content.ts:12289/12312 均无 event.trigger），故上限变化
            // 无法被技能监听。此处包裹这两个方法，在事件结算后按变化量摸牌，覆盖上限变化。
            init(player) {
              const origGain = player.gainMaxHp.bind(player);
              const origLose = player.loseMaxHp.bind(player);
              player.gainMaxHp = function(...args) {
                const evt = origGain(...args);
                const num = evt.num || 1;
                evt.then(async () => {
                  const d = Math.abs(num);
                  if (d > 0) await player.draw(d);
                }).catch(() => {
                });
                return evt;
              };
              player.loseMaxHp = function(...args) {
                const evt = origLose(...args);
                const num = evt.num || 1;
                evt.then(async () => {
                  const d = Math.abs(num);
                  if (d > 0) await player.draw(d);
                }).catch(() => {
                });
                return evt;
              };
            },
            trigger: {
              player: ["changeHp", "gainMaxHp", "loseMaxHp"]
            },
            async content(event, trigger, player) {
              const delta = Math.abs(trigger.num || 0);
              if (delta > 0) await player.draw(delta);
            }
          },
          // ===================== 坚守（锁定技 · 负血不死 + 防伤减上限）=====================
          diy012_jianshou: {
            charlotte: true,
            // 锁定技
            // ① 负血不死：技能挂上时即置 player.nodying = true（引擎原生开关，content.ts:12450 读取）。
            //    〔修正 v1.2〕原用 subSkill.init(enterGame) 注册，但引擎 addSkillTrigger 不登记子技能
            //    （同遥的 subSkill 触发失效坑），且 enterGame 未必触发技能事件；改由本技能 init
            //    在技能挂上时直接置 nodying，确保负血不死立即生效。
            init(player) {
              player.nodying = true;
            },
            // ② 受他伤且 hp<0 → 防止伤害 + 减1上限；③ 上限0 → 死亡
            trigger: { player: "damageBegin" },
            // 覆盖 damageBegin1~4（前缀匹配）
            forced: true,
            filter(event, player) {
              const src = event.source;
              if (!src || src === player) return false;
              return player.hp < 0;
            },
            async content(event, trigger, player) {
              trigger.num = 0;
              await player.loseMaxHp(1);
              if (player.hp > player.maxHp) player.hp = player.maxHp;
              if (player.maxHp <= 0) {
                player.nodying = false;
                await player.die(event.source);
              }
            }
          },
          // ===================== 界限（锁定技 · 弃装备换上限 + 回合内首张基本/锦囊 +X 无距离）=====================
          // 〔v1.5 按新描述〕限「你的回合内」，且分两类各限一次：本回合第一张基本牌 + 第一张普通锦囊牌
          //   各享一次「多选至多 X 目标」与「无距离限制」（最多 2 张）；回合始 phaseZhunbeiBegin 重置两标记。
          diy012_jiejian: {
            charlotte: true,
            // 锁定技
            // 初始化两类首牌标记（回合始会再重置）
            init(player) {
              player.storage.diy012_jiejian_basic_used = false;
              player.storage.diy012_jiejian_trick_used = false;
            },
            // ① 回合结束：弃所有装备（含手牌里的装备牌），每弃1张 +1 上限
            trigger: { player: "phaseJieshuBegin" },
            forced: true,
            async content(event, trigger, player) {
              const equips = player.getCards("he", (c) => get7.type(c) === "equip");
              for (const c of equips) {
                await player.discard(c);
                await player.gainMaxHp(1);
                if (player.hp > player.maxHp) player.hp = player.maxHp;
              }
            },
            // ② 回合内首张基本牌/首张普通锦囊：多选至多 X 目标 + 无距离
            mod: {
              // 多选目标：仅「你的回合内 + 该类型本回合首张」时 +X
              selectTarget(card, player, range) {
                if (!diy012_isEligible(card)) return;
                if (!Array.isArray(range)) return;
                if (_status4.currentPhase !== player) return;
                const isBasic = get7.type(card) === "basic";
                if (isBasic ? player.storage.diy012_jiejian_basic_used : player.storage.diy012_jiejian_trick_used) return;
                const X = diy012_X(player);
                if (range[1] !== -1) range[1] += X;
              },
              // 无距离限制：同门控，返回 true 即无视该牌射程要求（含杀/顺手等有 range 的牌）
              targetInRange(card, player, target) {
                if (!diy012_isEligible(card)) return;
                if (_status4.currentPhase !== player) return;
                const isBasic = get7.type(card) === "basic";
                if (isBasic ? player.storage.diy012_jiejian_basic_used : player.storage.diy012_jiejian_trick_used) return;
                return true;
              }
            },
            // 首牌标记（顶层 group 技能，global 触发 + filter，规避 subSkill 触发坑）
            group: ["diy012_jiejian_reset", "diy012_jiejian_first"]
          },
          // 回合始重置两类首牌标记（仅乌尔比安自己的回合）
          diy012_jiejian_reset: {
            charlotte: true,
            forced: true,
            trigger: { global: "phaseZhunbeiBegin" },
            filter(event, player) {
              return event.player === player;
            },
            content(event, trigger, player) {
              player.storage.diy012_jiejian_basic_used = false;
              player.storage.diy012_jiejian_trick_used = false;
            }
          },
          // 使用首张基本牌/普通锦囊后按类型置位
          diy012_jiejian_first: {
            charlotte: true,
            forced: true,
            trigger: { global: "useCard" },
            filter(event, player) {
              return event.player === player && diy012_isEligible(event.card);
            },
            content(event, trigger, player) {
              if (get7.type(trigger.card) === "basic") player.storage.diy012_jiejian_basic_used = true;
              else player.storage.diy012_jiejian_trick_used = true;
            }
          }
        },
        translate: {
          diy012_urbian: "\u4E4C\u5C14\u6BD4\u5B89",
          diy012_xuemai: "\u8840\u8109",
          "diy012_xuemai_info": "\u9501\u5B9A\u6280\uFF0C\u4F60\u7684\u4F53\u529B\u503C\u6216\u4F53\u529B\u4E0A\u9650\u6BCF\u53D1\u751F1\u70B9\u53D8\u5316\u540E\uFF0C\u4F60\u6478\u4E00\u5F20\u724C\u3002",
          diy012_jianshou: "\u575A\u5B88",
          "diy012_jianshou_info": "\u9501\u5B9A\u6280\uFF0C\u4F60\u7684\u4F53\u529B\u503C\u5C0F\u4E8E0\u65F6\uFF0C\u4F60\u4E0D\u4F1A\u6B7B\u4EA1\u3002\u5F53\u4F60\u53D7\u5230\u5176\u4ED6\u89D2\u8272\u9020\u6210\u7684\u4F24\u5BB3\u65F6\uFF0C\u82E5\u4F60\u7684\u4F53\u529B\u503C\u5C0F\u4E8E0\uFF0C\u4F60\u9632\u6B62\u6B64\u4F24\u5BB3\uFF0C\u7136\u540E\u51CF1\u70B9\u4F53\u529B\u4E0A\u9650\u3002\u5F53\u4F60\u7684\u4F53\u529B\u4E0A\u9650\u4E3A0\u65F6\uFF0C\u4F60\u6B7B\u4EA1\u3002",
          diy012_jiejian: "\u754C\u9650",
          "diy012_jiejian_info": "\u9501\u5B9A\u6280\uFF0C\u4F60\u7684\u56DE\u5408\u7ED3\u675F\u65F6\uFF0C\u4F60\u5F03\u7F6E\u4F60\u7684\u6240\u6709\u88C5\u5907\u724C\uFF0C\u6BCF\u5F03\u7F6E\u4E00\u5F20\uFF0C\u4F60\u589E\u52A01\u70B9\u4F53\u529B\u4E0A\u9650\u3002\u4F60\u4F7F\u7528\u7684\u57FA\u672C\u724C\u6216\u666E\u901A\u9526\u56CA\u724C\u53EF\u4EE5\u591A\u9009\u62E9\u81F3\u591AX\u4E2A\u76EE\u6807\uFF0C\u4E14\u65E0\u8DDD\u79BB\u9650\u5236\uFF08X\u4E3A\u4F60\u5DF2\u635F\u5931\u4F53\u529B\u503C\uFF09\u3002"
        }
      },
      intro: "v1.5\uFF1A\u4E4C\u5C14\u6BD4\u5B89\uFF08diy012_urbian\uFF09\xB7 \u7FA4/3\u88404\u4E0A\u9650 \xB7 \u4E09\u9501\u5B9A\u6280\u95ED\u73AF\u3002\u3014v1.5 \u6309\u9700\u6C42\u65B9\u65B0\u63CF\u8FF0\u3015\u754C\u9650\u2461\u9650\u300C\u4F60\u7684\u56DE\u5408\u5185\u300D\uFF0C\u4E14\u5206\u4E24\u7C7B\u5404\u9650\u4E00\u6B21\uFF1A\u672C\u56DE\u5408\u7B2C\u4E00\u5F20\u57FA\u672C\u724C + \u7B2C\u4E00\u5F20\u666E\u901A\u9526\u56CA\u724C\uFF0C\u5404\u4EAB\u4E00\u6B21\u300E\u591A\u9009\u81F3\u591A X \u76EE\u6807\u300F\u4E0E\u300E\u65E0\u8DDD\u79BB\u9650\u5236\u300F\uFF08\u6700\u591A 2 \u5F20\uFF09\uFF1B\u56DE\u5408\u59CB phaseZhunbeiBegin \u91CD\u7F6E\u3002+X \u8D70 selectTarget\u3001\u65E0\u8DDD\u79BB\u8D70 targetInRange\uFF08\u5747\u5E26 card\uFF0C\u53EF\u7CBE\u786E\u6309\u724C\u578B\u5224\u5B9A\uFF09\uFF0C\u66FF\u4EE3\u65E7 globalFrom\u3002X=\u5DF2\u635F\u5931\u4F53\u529B\u3002\u2460\u754C\u9650\xB7\u5F03\u88C5\u5907\u542B\u3010\u624B\u724C\u88C5\u5907\u3011+\u3010\u88C5\u5907\u533A\u3011\uFF0C\u6BCF\u5F031\u5F20+1\u4E0A\u9650\uFF08\u8840\u8109\u6309+1\u4E0A\u9650\u64781\u724C\uFF09\u3002\u2461\u575A\u5B88\xB7\u7236 init \u7F6E nodying \u8D1F\u8840\u4E0D\u6B7B\uFF1BdamageBegin(hp<0\u4E14\u53D7\u4ED6\u4F24)\u2192\u9632\u4F24+\u51CF1\u4E0A\u9650\uFF0C\u4E0A\u96500\u6B7B\u3002\u2462\u8840\u8109\xB7gainMaxHp/loseMaxHp \u5F15\u64CE\u4E0D\u89E6\u53D1\u6280\u80FD\u4E8B\u4EF6\u2192\u5305\u88F9\u65B9\u6CD5\u672C\u4F53\u6309|\u0394|\u6478\u724C\u3002\u3014\u5F85\u786E\u8BA4\u3015\u2460\u8840\u8109\u5C01\u9876 \u2461\u8FC7\u724C\u5FAA\u73AF\u5C01\u9876 \u2463hp==0 \u8FB9\u754C \u2464\u6DA8\u4E0A\u9650\u5C01\u9876 \u2465X \u5C01\u9876 \u2468\u52BF\u529B\u3002",
      author: "\u4F60\u7684\u540D\u5B57",
      diskURL: "",
      forumURL: "",
      version: "1.5"
    },
    files: { character: [], card: [], skill: [], audio: [] }
  };
}

// ../_workbuddy_tmp/v41_build/m08.js
import { get as get8 } from "noname";
var KZ_EXEMPT = ["shan", "tao", "wuxie", "taoyuan"];
function index_default8() {
  return {
    name: "diy013_liliangwang",
    author: "\u4F60\u7684\u540D\u5B57",
    version: "1.8.1",
    connect: false,
    editable: false,
    content() {
    },
    package: {
      character: {
        character: {
          diy013_liliangwang: {
            sex: "male",
            group: "qun",
            // 群势力
            hp: 4,
            maxHp: 4,
            // ⚠️ 只列 3 个主动技能；响应 helper 走 group 挂载，不进面板
            skills: ["diy013_zhanhun", "diy013_kuangzhan", "diy013_lianji"],
            names: "\u529B\u91CF\u738B",
            // ⚠️ 屏上将名用 names 字段，不用 translate
            img: "extension/diy013_liliangwang/image/character/diy013_liliangwang.jpg"
            // 2026-10-16 补立绘（半身像）
          }
        },
        translate: { diy013_liliangwang: "\u529B\u91CF\u738B" }
      },
      skill: {
        skill: {
          // ===================== 战魂（锁定技 · 全局满血回复）=====================
          diy013_zhanhun: {
            charlotte: true,
            // 锁定技
            trigger: { global: "phaseUseEnd" },
            // 任一角色（含自己）出牌阶段结束
            forced: true,
            filter(event, player) {
              return player.hp < Math.ceil(player.maxHp / 2);
            },
            content(event, trigger, player) {
              const need = player.maxHp - player.hp;
              if (need > 0) player.recover(need);
            }
          },
          // ===================== 狂战（核心 · 单个主动技）=====================
          // 单个「狂战」按钮：点击 → 选一张非豁免牌 → 在【杀】/【决斗】中二选一 → 视为使用（弹目标、标准结算）。
          // 响应替代杀由 group 挂载的 diy013_kuangzhan_respond 提供（不出按钮）。
          diy013_kuangzhan: {
            group: ["diy013_kuangzhan_respond"],
            enable: ["phaseUse"],
            // 出牌阶段可点击的主动技（单按钮）
            filter(event, player) {
              return player.countCards("he", (card) => !KZ_EXEMPT.includes(get8.name(card))) > 0;
            },
            async content(event, trigger, player) {
              const choose = await player.chooseCard("he", (card) => !KZ_EXEMPT.includes(get8.name(card))).set("prompt", "\u72C2\u6218\uFF1A\u9009\u62E9\u4E00\u5F20\u975E\u3010\u95EA\u3011\u3010\u6843\u3011\u3010\u65E0\u61C8\u53EF\u51FB\u3011\u3010\u6843\u56ED\u7ED3\u4E49\u3011\u7684\u724C\uFF0C\u5F53\u3010\u6740\u3011\u6216\u3010\u51B3\u6597\u3011\u4F7F\u7528").set("ai", (card) => 6 - get8.value(card)).forResult();
              if (!choose.bool) return;
              const cards = choose.cards;
              const ctrl = await player.chooseControl("\u5F53\u3010\u6740\u3011\u4F7F\u7528", "\u5F53\u3010\u51B3\u6597\u3011\u4F7F\u7528").set("prompt", "\u72C2\u6218\uFF1A\u8BF7\u9009\u62E9\u5C06\u5176\u89C6\u4E3A\u3010\u6740\u3011\u8FD8\u662F\u3010\u51B3\u6597\u3011\u4F7F\u7528").set("ai", () => "\u5F53\u3010\u6740\u3011\u4F7F\u7528").forResult();
              const name = ctrl.control === "\u5F53\u3010\u51B3\u6597\u3011\u4F7F\u7528" ? "juedou" : "sha";
              await player.chooseUseTarget(get8.autoViewAs({ name }, cards), cards);
            },
            ai: {
              // 主动技 AI：有非豁免牌即倾向发动
              basic: {
                order: 8,
                skill(player) {
                  return player.countCards("he", (card) => !KZ_EXEMPT.includes(get8.name(card))) > 0 ? 1 : 0;
                },
                result: { player: 1 }
              }
            }
          },
          // ===================== 狂战·响应（隐藏顶层技能 · 由 group 挂载）=====================
          // 仅在【南蛮入侵】/【借刀杀人】/【决斗】要求"打出杀"时顶替：将一张非豁免牌当【杀】打出。
          // enable 只含 chooseToRespond → 出牌阶段不生成按钮（隐形的响应技能）。
          diy013_kuangzhan_respond: {
            enable: ["chooseToRespond"],
            filterCard(card, player) {
              return !KZ_EXEMPT.includes(get8.name(card));
            },
            position: "he",
            // 手牌 + 装备区
            viewAs: { name: "sha" },
            viewAsFilter(player) {
              return player.countCards("he", (card) => !KZ_EXEMPT.includes(get8.name(card))) > 0;
            },
            prompt: "\u5C06\u4E00\u5F20\u975E\u3010\u95EA\u3011\u3010\u6843\u3011\u3010\u65E0\u61C8\u53EF\u51FB\u3011\u3010\u6843\u56ED\u7ED3\u4E49\u3011\u7684\u724C\u5F53\u3010\u6740\u3011\u6253\u51FA",
            check(card) {
              return 1 / Math.max(0.1, get8.value(card));
            },
            ai: {
              respondSha: true,
              // 需要打出杀响应时（南蛮/借刀/决斗）引擎自动提供本技能顶替
              skillTagFilter(player) {
                return player.countCards("he", (card) => !KZ_EXEMPT.includes(get8.name(card))) > 0;
              },
              order: 8,
              result: { player: 1 }
            }
          },
          // ===================== 连击（触发技 · 付费重结算）=====================
          diy013_lianji: {
            trigger: { player: "useCard" },
            // 自己使用的牌
            forced: false,
            // 可选是否发动
            filter(event, player) {
              if (player.storage.diy013_lianji_lock) return false;
              if (event.player !== player) return false;
              const card = event.card;
              if (card) {
                if (get8.type(card) === "equip") return false;
              }
              return true;
            },
            // 决策点：是否发动（失1血换重结算）。放 cost 而非 content，规避结算/动画流程吞窗。
            async cost(event, trigger, player) {
              event.result = await player.chooseBool("\u8FDE\u51FB\uFF1A\u5931\u53BB1\u70B9\u4F53\u529B\uFF0C\u4EE4\u6B64\u724C\u518D\u6B21\u7ED3\u7B97\uFF1F").set("ai", () => player.hp > 1).forResult();
            },
            async content(event, trigger, player) {
              player.storage.diy013_lianji_lock = true;
              try {
                await player.loseHp(1);
                trigger.effectCount += 1;
              } finally {
                player.storage.diy013_lianji_lock = false;
              }
            },
            ai: {
              skill(card, player) {
                return player.hp > 1 ? 1 : 0;
              }
            }
          }
        },
        translate: {
          diy013_liliangwang: "\u529B\u91CF\u738B",
          diy013_zhanhun: "\u6218\u9B42",
          "diy013_zhanhun_info": "\u9501\u5B9A\u6280\u3002\u6BCF\u5F53\u4E00\u540D\u89D2\u8272\u7684\u51FA\u724C\u9636\u6BB5\u7ED3\u675F\u65F6\uFF0C\u82E5\u4F60\u7684\u4F53\u529B\u503C\u5C0F\u4E8E\u4F60\u4F53\u529B\u4E0A\u9650\u7684\u4E00\u534A\uFF0C\u4F60\u5C06\u4F53\u529B\u56DE\u590D\u81F3\u4F53\u529B\u4E0A\u9650\u3002",
          diy013_kuangzhan: "\u72C2\u6218",
          "diy013_kuangzhan_info": "\u51FA\u724C\u9636\u6BB5\uFF0C\u4F60\u53EF\u4EE5\u5C06\u4E00\u5F20\u9664\u3010\u95EA\u3011\u3001\u3010\u6843\u3011\u3001\u3010\u65E0\u61C8\u53EF\u51FB\u3011\u3001\u3010\u6843\u56ED\u7ED3\u4E49\u3011\u5916\u7684\u724C\u5F53\u3010\u6740\u3011\u6216\u3010\u51B3\u6597\u3011\u4F7F\u7528\uFF08\u4F7F\u7528\u524D\u4E8C\u9009\u4E00\uFF09\uFF1B\u5F53\u3010\u5357\u86EE\u5165\u4FB5\u3011\u3001\u3010\u501F\u5200\u6740\u4EBA\u3011\u3001\u3010\u51B3\u6597\u3011\u8981\u6C42\u4F60\u6253\u51FA\u3010\u6740\u3011\u65F6\uFF0C\u4F60\u4EA6\u53EF\u5C06\u6B64\u7C7B\u724C\u5F53\u3010\u6740\u3011\u6253\u51FA\u54CD\u5E94\u3002",
          diy013_kuangzhan_respond: "\u72C2\u6218",
          "diy013_kuangzhan_respond_info": "\u5F53\u3010\u5357\u86EE\u5165\u4FB5\u3011\u3001\u3010\u501F\u5200\u6740\u4EBA\u3011\u3001\u3010\u51B3\u6597\u3011\u8981\u6C42\u4F60\u6253\u51FA\u3010\u6740\u3011\u65F6\uFF0C\u4F60\u53EF\u4EE5\u5C06\u4E00\u5F20\u9664\u3010\u95EA\u3011\u3001\u3010\u6843\u3011\u3001\u3010\u65E0\u61C8\u53EF\u51FB\u3011\u3001\u3010\u6843\u56ED\u7ED3\u4E49\u3011\u5916\u7684\u724C\u5F53\u3010\u6740\u3011\u6253\u51FA\u3002",
          diy013_lianji: "\u8FDE\u51FB",
          "diy013_lianji_info": "\u89E6\u53D1\u6280\u3002\u5F53\u4F60\u4F7F\u7528\u4E00\u5F20\u724C\uFF08\u88C5\u5907\u9664\u5916\uFF09\u65F6\uFF0C\u4F60\u53EF\u4EE5\u5931\u53BB1\u70B9\u4F53\u529B\uFF1B\u82E5\u5982\u6B64\u505A\uFF0C\u4EE4\u6B64\u724C\u518D\u6B21\u7ED3\u7B97\u4E00\u6B21\u3002"
        }
      },
      intro: "v1.8.1\uFF1A\u529B\u91CF\u738B\uFF08diy013_liliangwang\uFF09\xB7 \u7FA4/4\u8840\u3002\u3010\u6218\u9B42\u65F6\u673A\u8C03\u6574\u3011\u6218\u9B42\uFF08\u9501\u5B9A\u6280\uFF09\u89E6\u53D1\u7531\u300C\u5F03\u724C\u9636\u6BB5\u7ED3\u675F\uFF08phaseDiscardEnd\uFF09\u300D\u6539\u4E3A\u300C\u51FA\u724C\u9636\u6BB5\u7ED3\u675F\uFF08phaseUseEnd\uFF0C\u5F15\u64CE content.ts:5095 \u6D3E\u53D1\uFF09\u300D\u2014\u2014\u5373\u6BCF\u540D\u89D2\u8272\u51FA\u724C\u9636\u6BB5\u4E00\u7ED3\u675F\u5C31\u5224\u5B9A\u81EA\u8EAB\u4F53\u529B\u662F\u5426\u4F4E\u4E8E\u4E0A\u9650\u4E00\u534A\uFF0C\u662F\u5219\u56DE\u6EE1\u3002\u4E09\u6280\u95ED\u73AF\uFF08\u72C2\u6218\u4F9B\u7ED9\u2192\u8FDE\u51FB\u653E\u5927\u2192\u6218\u9B42\u56DE\u8840\uFF09\u4E0D\u53D8\uFF1B\u672C\u7248\u540C\u6B65\u66F4\u6362\u65B0\u7ACB\u7ED8\u3002v1.8\u3010UI \u4FEE\u590D\u3011\u72C2\u6218\u7531\u300C\u6740/\u51B3\u6597\u4E24\u4E2A\u72EC\u7ACB\u6309\u94AE\u300D\u6539\u56DE\u300C\u5355\u4E2A\u3010\u72C2\u6218\u3011\u6309\u94AE\u300D\uFF1A\u51FA\u724C\u9636\u6BB5\u70B9\u3010\u72C2\u6218\u3011\u2192 \u9009\u4E00\u5F20\u975E\u8C41\u514D\u724C \u2192 \u5F39\u51FA\u3010\u5F53\u3010\u6740\u3011\u4F7F\u7528\u3011/\u3010\u5F53\u3010\u51B3\u6597\u3011\u4F7F\u7528\u3011\u4E8C\u9009\u4E00 \u2192 \u89C6\u4E3A\u4F7F\u7528\u5E76\u5F39\u76EE\u6807\uFF08\u4E3B\u6280\u80FD enable [phaseUse] \u5355\u4E00\u5165\u53E3\uFF0C\u907F\u514D\u4E24\u4E2A viewAs \u6280\u80FD\u5404\u51FA\u4E00\u6309\u94AE\uFF09\u3002\u54CD\u5E94\uFF08\u5357\u86EE/\u501F\u5200/\u51B3\u6597 \u8981\u6C42\u6253\u51FA\u6740\uFF09\u7531 group \u6302\u8F7D\u7684\u9690\u85CF\u9876\u5C42\u6280\u80FD diy013_kuangzhan_respond\uFF08enable [chooseToRespond] + viewAs{sha} + respondSha\uFF09\u63D0\u4F9B\uFF1Agroup \u6210\u5458\u53EF\u88AB\u54CD\u5E94\u679A\u4E3E\u770B\u5230\u3001\u4F46\u4E0D\u51FA\u6309\u94AE\u3002\u4FDD\u7559 v1.7 \u4FEE\u590D\uFF1A\u7528\u9876\u5C42\u6280\u80FD\u800C\u975E subSkill\uFF08subSkill \u4E0D\u8FDB getSkills \u2192 \u54CD\u5E94\u4E0D\u53EF\u89C1\uFF09\uFF1B\u4E3B\u52A8 chooseUseTarget(vcard,cards) \u4E0E\u54CD\u5E94 viewAs \u5747\u81EA\u52A8\u6D88\u8017\u6E90\u724C\uFF0C\u675C\u7EDD\u65E0\u9650\u8F6C\u5316\u3002",
      author: "\u4F60\u7684\u540D\u5B57",
      diskURL: "",
      forumURL: "",
      version: "1.8.1"
    },
    files: { character: [], card: [], skill: [], audio: [] }
  };
}

// ../_workbuddy_tmp/v41_build/m09.js
import { game as game6, get as get9 } from "noname";
var ZHUO_KEY = "diy014_zhuoran_mark";
async function addZhuoRan(target, n) {
  if (target.storage[ZHUO_KEY] === void 0) target.storage[ZHUO_KEY] = 0;
  let v = target.storage[ZHUO_KEY] + n;
  if (v > 100) v = 100;
  target.storage[ZHUO_KEY] = v;
  target.markSkill(ZHUO_KEY);
  if (v >= 100) {
    await target.damage({ num: 1, nature: "fire", nosource: true });
    removeZhuoRan(target);
  }
}
function hasZhuoRan(p) {
  return p.storage[ZHUO_KEY] !== void 0;
}
function removeZhuoRan(target) {
  target.unmarkSkill(ZHUO_KEY);
  delete target.storage[ZHUO_KEY];
}
function isAttributeDamage(trigger) {
  return trigger.hasNature();
}
function index_default9() {
  return {
    name: "diy014_zhuoran",
    author: "\u4F60\u7684\u540D\u5B57",
    version: "1.3",
    connect: false,
    editable: false,
    content() {
    },
    package: {
      character: {
        character: {
          diy014_zhuoran: {
            sex: "male",
            // 〔待确认〕⑨ 性别
            group: "qun",
            // 群（〔待确认〕⑨ 群/神）
            hp: 4,
            maxHp: 4,
            // 〔待确认〕⑨ 体力，按项目常规 4 血
            // 只列 4 个主技能；被动 helper 走 group 挂载，不进面板（同名 translate 避免显第二名称）
            skills: ["diy014_benyuan", "diy014_rongdian", "diy014_liaoyuan", "diy014_chongran"],
            names: "\u70DB\u714C",
            // ⚠️ 屏上将名用 names 字段，不用 translate
            img: "extension/diy014_zhuoran/image/character/diy014_zhuoran.jpg"
            // 2026-10-15 补立绘
          }
        },
        translate: { diy014_zhuoran: "\u70DB\u714C" }
      },
      skill: {
        skill: {
          // ============ 本源（锁定技 · 火伤化 + 减火 + 喂灼燃）============
          diy014_benyuan: {
            charlotte: true,
            // ① 火伤化（全局 damageBegin1，烛煌为来源时转火焰）
            // ① 受火减伤（自身 damageBegin4，受害者=烛煌且火焰时 -1）
            trigger: { global: "damageBegin1", player: "damageBegin4" },
            forced: true,
            content(event, trigger, player) {
              if (trigger.name === "damageBegin1" || trigger.name === "damageBegin2") {
                if (trigger.source === player) trigger.nature = "fire";
              }
              if (trigger.name === "damageBegin4" && trigger.player === player && trigger.hasNature("fire")) {
                trigger.num = Math.max(0, trigger.num - 1);
              }
            },
            // ② 喂灼燃：对有灼燃的其他角色造成伤害后 +20（顶层 helper，group 挂载）
            group: ["diy014_benyuan_feed"]
          },
          diy014_benyuan_feed: {
            charlotte: true,
            trigger: { global: "damageAfter" },
            forced: true,
            filter(event, player) {
              if (event.source !== player) return false;
              const t = event.player;
              if (!t || t === player) return false;
              return hasZhuoRan(t);
            },
            async content(event, trigger, player) {
              await addZhuoRan(trigger.player, 20);
            }
          },
          // ============ 熔点（锁定技 · 系统总控）============
          diy014_rongdian: {
            charlotte: true,
            // (a) 开户：游戏开始 & 烛煌回合开始，给所有无标记者开户(值0，建可见节点)
            // 〔v1.3 修复〕原用 player:"phaseZhunbeiBegin"，本引擎 build 下 player 角色 trigger 真机不稳（铁律#11）
            //   → 改 global 触发 + filter(仅自己回合)，确保「你的回合开始」也开户（引爆后清标的角色会被补回）。
            trigger: { global: ["gameStart", "phaseZhunbeiBegin"] },
            forced: true,
            filter(event, player) {
              return event.name === "gameStart" || event.player === player;
            },
            async content(event, trigger, player) {
              for (const p of game6.players) {
                if (p.storage[ZHUO_KEY] === void 0) {
                  p.storage[ZHUO_KEY] = 0;
                  p.markSkill(ZHUO_KEY);
                }
              }
              const proxy = player.storage.diy014_liaoyuan_proxy;
              if (proxy && hasZhuoRan(proxy)) player.storage.diy014_liaoyuan_proxy = null;
              player.storage.diy014_liaoyuan_used = false;
            },
            // (c) 无标记者受属性伤害 +1（顶层 helper，group 挂载）
            group: ["diy014_rongdian_attr"]
          },
          diy014_rongdian_attr: {
            charlotte: true,
            trigger: { global: "damageBegin4" },
            forced: true,
            filter(event, player) {
              if (hasZhuoRan(event.player)) return false;
              return isAttributeDamage(event);
            },
            content(event, trigger, player) {
              trigger.num = trigger.num + 1;
            }
          },
          // ============ 燎原（主动技 · 代理传播）============
          diy014_liaoyuan: {
            enable: "phaseUse",
            filter(event, player) {
              if (player.storage.diy014_liaoyuan_used) return false;
              return player.countCards("h") >= 1;
            },
            async content(event, trigger, player) {
              const result = await player.chooseTarget(
                "\u71CE\u539F\uFF1A\u9009\u62E9\u4E00\u540D\u5176\u4ED6\u89D2\u8272\uFF0C\u79FB\u9664\u5176\u300C\u707C\u71C3\u300D\u6807\u8BB0",
                (card, pl, target) => target !== pl
              ).set("ai", (target) => target !== player ? 1 : 0).forResult();
              if (!result || !result.bool) return;
              const proxy = result.targets ? result.targets[0] : null;
              if (!proxy) return;
              await player.chooseToDiscard(1, true);
              removeZhuoRan(proxy);
              player.storage.diy014_liaoyuan_proxy = proxy;
              player.storage.diy014_liaoyuan_used = true;
            },
            // 代理造成伤害后，受害者 +5 灼燃（顶层 helper，group 挂载）
            group: ["diy014_liaoyuan_watch"],
            ai: {
              basic: {
                order: 7,
                skill(player) {
                  return player.countCards("h") >= 1 && !player.storage.diy014_liaoyuan_used ? 1 : 0;
                },
                result: { player: 1 }
              }
            }
          },
          diy014_liaoyuan_watch: {
            charlotte: true,
            trigger: { global: "damageAfter" },
            forced: true,
            filter(event, player) {
              const proxy = player.storage.diy014_liaoyuan_proxy;
              if (!proxy || proxy.isDead && proxy.isDead()) return false;
              return event.source === proxy;
            },
            async content(event, trigger, player) {
              const proxy = player.storage.diy014_liaoyuan_proxy;
              const victim = trigger.player;
              if (victim && victim !== proxy) await addZhuoRan(victim, 5);
              if (hasZhuoRan(proxy)) player.storage.diy014_liaoyuan_proxy = null;
            }
          },
          // ============ 重燃（锁定技 · 复活 + 恢复爆发）============
          diy014_chongran: {
            charlotte: true,
            // ① 致命伤 → 防伤 + 回 1 + 进重燃（damageBegin4 用最终 num 做精确致命判定）
            trigger: { player: "damageBegin4" },
            forced: true,
            filter(event, player) {
              if (player.storage.diy014_chongran) return false;
              return player.hp - (event.num || 0) <= 0;
            },
            async content(event, trigger, player) {
              trigger.num = 0;
              await player.changeHp(1 - player.hp);
              player.storage.diy014_chongran = true;
              player.storage.diy014_chongran_mark = 1;
              player.markSkill("diy014_chongran_mark");
            },
            // ① 重燃期间：跳过 出牌/弃牌 + 禁桃酒 + 回合始回1弃1；② 回满→退重燃+攻范围他人+40+摸2
            group: ["diy014_chongran_skip", "diy014_chongran_ban", "diy014_chongran_turn", "diy014_chongran_recover"]
          },
          diy014_chongran_skip: {
            charlotte: true,
            trigger: { player: ["phaseUseBegin", "phaseDiscard"] },
            forced: true,
            filter(event, player) {
              return player.storage.diy014_chongran;
            },
            content(event, trigger, player) {
              trigger.cancel();
            }
          },
          diy014_chongran_ban: {
            charlotte: true,
            mod: {
              // 重燃期间禁用【桃】【酒】
              cardEnabled(card, player, event) {
                if (player.storage.diy014_chongran && (get9.name(card) === "tao" || get9.name(card) === "jiu")) return false;
              }
            }
          },
          diy014_chongran_turn: {
            charlotte: true,
            trigger: { player: "phaseZhunbeiBegin" },
            forced: true,
            filter(event, player) {
              return player.storage.diy014_chongran;
            },
            async content(event, trigger, player) {
              await player.recover(1);
              if (player.storage.diy014_chongran) await player.chooseToDiscard(1, true);
            }
          },
          diy014_chongran_recover: {
            charlotte: true,
            // ② 回满：changeHp 在 hp 更新后触发，判 hp>=maxHp（无 recoverAfter/changeHpAfter）
            trigger: { player: "changeHp" },
            forced: true,
            filter(event, player) {
              return player.storage.diy014_chongran && player.hp >= player.maxHp;
            },
            async content(event, trigger, player) {
              player.storage.diy014_chongran = false;
              player.unmarkSkill("diy014_chongran_mark");
              delete player.storage.diy014_chongran_mark;
              const targets = game6.players.filter(
                (p) => p !== player && get9.distance(player, p) <= player.getAttackRange()
              );
              for (const t of targets) await addZhuoRan(t, 40);
              await player.draw(2);
            }
          },
          // ============ 灼燃（可见标记 · 数值 0~100）============
          // 〔v1.2 Z1〕注册为无名杀原生可见标记：mark:true + intro.markcount（真 → 值0也建节点，数值实时渲染角标）。
          //   数值存于 storage[ZHUO_KEY]（即本名 diy014_zhuoran_mark），addZhuoRan/熔点(a)/燎原 经 markSkill/unmarkSkill 维护。
          //   逻辑判"有标记"用 storage !== undefined（非 hasMark，因 hasMark=countMark>0 在值0时为 false，正好保住"值0有标记"语义）。
          diy014_zhuoran_mark: {
            mark: true,
            intro: {
              name: "\u707C\u71C3",
              content: "\u707C\u71C3\uFF1A\u8FBE\u5230100\u65F6\u53D7\u52301\u70B9\u65E0\u6765\u6E90\u706B\u7130\u4F24\u5BB3\u5E76\u79FB\u9664\uFF1B\u65E0\u6807\u8BB0\u8005\u53D7\u5C5E\u6027\u4F24\u5BB3+1\u3002",
              markcount: true,
              onunmark: true
              // 〔v1.3〕unmarkSkill 时一并 delete storage（配合 removeZhuoRan 兜底）
            }
          },
          // ============ 重燃（可见状态标记 · 类似翻面的状态展示，但无翻面机制副作用）============
          diy014_chongran_mark: {
            mark: true,
            intro: {
              name: "\u91CD\u71C3",
              content: "\u91CD\u71C3\u72B6\u6001\uFF1A\u8DF3\u8FC7\u51FA\u724C/\u5F03\u724C\u9636\u6BB5\uFF0C\u4E0D\u80FD\u4F7F\u7528\u3010\u6843\u3011\u3010\u9152\u3011\uFF1B\u56DE\u5408\u5F00\u59CB\u56DE\u590D1\u70B9\u4F53\u529B\u5E76\u5F03\u4E00\u5F20\u724C\uFF1B\u4F53\u529B\u56DE\u6EE1\u65F6\u9000\u51FA\u3002",
              nocount: true,
              // 状态标记不显示数字
              onunmark: true
            }
          }
        },
        translate: {
          diy014_zhuoran: "\u70DB\u714C",
          diy014_benyuan: "\u672C\u6E90",
          "diy014_benyuan_info": "\u9501\u5B9A\u6280\uFF0C\u2460\u4F60\u9020\u6210\u7684\u4F24\u5BB3\u5747\u89C6\u4E3A\u706B\u7130\u4F24\u5BB3\u3002\u4F60\u53D7\u5230\u7684\u706B\u7130\u4F24\u5BB3-1\u3002\u2461\u5F53\u4F60\u5BF9\u6709\u300C\u707C\u71C3\u300D\u6807\u8BB0\u7684\u5176\u4ED6\u89D2\u8272\u9020\u6210\u4F24\u5BB3\u540E\uFF0C\u4F60\u4EE4\u5176\u83B7\u5F9720\u70B9\u300C\u707C\u71C3\u300D\u3002",
          diy014_rongdian: "\u7194\u70B9",
          "diy014_rongdian_info": "\u9501\u5B9A\u6280\uFF0C\u6E38\u620F\u5F00\u59CB\u65F6\u548C\u4F60\u7684\u56DE\u5408\u5F00\u59CB\u65F6\uFF0C\u4EE4\u6CA1\u6709\u300C\u707C\u71C3\u300D\u6807\u8BB0\u7684\u89D2\u8272\u83B7\u5F971\u679A\u300C\u707C\u71C3\u300D\u6807\u8BB0\uFF08\u521D\u59CB\u503C\u4E3A0\uFF0C\u4E0A\u9650\u4E3A100\uFF09\u3002\u5F53\u4E00\u540D\u89D2\u8272\u7684\u300C\u707C\u71C3\u300D\u503C\u8FBE\u5230100\u6216\u66F4\u9AD8\u65F6\uFF0C\u7ACB\u5373\u8FDB\u884C\u7ED3\u7B97\uFF1A\u5176\u53D7\u52301\u70B9\u65E0\u6765\u6E90\u7684\u706B\u7130\u4F24\u5BB3\uFF0C\u7136\u540E\u79FB\u9664\u5176\u300C\u707C\u71C3\u300D\u6807\u8BB0\u3002\u6CA1\u6709\u300C\u707C\u71C3\u300D\u6807\u8BB0\u7684\u89D2\u8272\u53D7\u5230\u5C5E\u6027\u4F24\u5BB3\u65F6\uFF0C\u6B64\u4F24\u5BB3+1\u3002",
          diy014_liaoyuan: "\u71CE\u539F",
          "diy014_liaoyuan_info": "\u4E3B\u52A8\u6280\uFF0C\u51FA\u724C\u9636\u6BB5\u9650\u4E00\u6B21\uFF0C\u4F60\u53EF\u4EE5\u5F03\u7F6E\u4E00\u5F20\u724C\u5E76\u9009\u62E9\u4E00\u540D\u5176\u4ED6\u89D2\u8272\u3002\u4F60\u79FB\u9664\u8BE5\u89D2\u8272\u7684\u300C\u707C\u71C3\u300D\u6807\u8BB0\u3002\u5F53\u5176\u9020\u6210\u4F24\u5BB3\u540E\uFF0C\u4F60\u4EE4\u53D7\u5230\u4F24\u5BB3\u7684\u89D2\u8272\u83B7\u5F975\u70B9\u300C\u707C\u71C3\u300D\u3002\u76F4\u5230\u8BE5\u89D2\u8272\u91CD\u65B0\u83B7\u5F97\u300C\u707C\u71C3\u300D\u6807\u8BB0\u65F6\uFF0C\u6B64\u6548\u679C\u5931\u6548\u3002",
          diy014_chongran: "\u91CD\u71C3",
          "diy014_chongran_info": "\u9501\u5B9A\u6280\uFF0C\u2460\u5F53\u4F60\u53D7\u5230\u81F4\u547D\u4F24\u5BB3\u65F6\uFF0C\u82E5\u4F60\u672A\u5904\u4E8E\u300C\u91CD\u71C3\u300D\u72B6\u6001\uFF0C\u4F60\u9632\u6B62\u6B64\u4F24\u5BB3\uFF0C\u5C06\u4F53\u529B\u56DE\u590D\u81F31\u70B9\u5E76\u8FDB\u5165\u300C\u91CD\u71C3\u300D\u72B6\u6001\uFF08\u4F60\u8DF3\u8FC7\u4F60\u7684\u51FA\u724C\u9636\u6BB5\u548C\u5F03\u724C\u9636\u6BB5\uFF0C\u4E14\u4F60\u4E0D\u80FD\u4F7F\u7528\u3010\u6843\u3011\u548C\u3010\u9152\u3011\uFF1B\u4F60\u7684\u56DE\u5408\u5F00\u59CB\u65F6\uFF0C\u4F60\u56DE\u590D1\u70B9\u4F53\u529B\u5E76\u5F03\u7F6E\u4E00\u5F20\u724C\uFF09\u3002\u2461\u5F53\u4F60\u7684\u4F53\u529B\u503C\u56DE\u590D\u81F3\u4F53\u529B\u4E0A\u9650\u65F6\uFF0C\u4F60\u9000\u51FA\u300C\u91CD\u71C3\u300D\u72B6\u6001\uFF0C\u4EE4\u4F60\u653B\u51FB\u8303\u56F4\u5185\u7684\u5176\u4ED6\u89D2\u8272\u5404\u83B7\u5F9740\u70B9\u300C\u707C\u71C3\u300D\uFF0C\u7136\u540E\u4F60\u6478\u4E24\u5F20\u724C\u3002",
          // 隐藏 helper 同名（避免面板显第二名称）
          diy014_benyuan_feed: "\u672C\u6E90",
          "diy014_benyuan_feed_info": "\u672C\u6E90\u2461\uFF1A\u5BF9\u6709\u707C\u71C3\u7684\u5176\u4ED6\u89D2\u8272\u9020\u6210\u4F24\u5BB3\u540E\u4EE4\u5176+20\u707C\u71C3\uFF08\u542B\u8FBE100\u5F15\u7206\uFF09\u3002",
          diy014_rongdian_attr: "\u7194\u70B9",
          "diy014_rongdian_attr_info": "\u7194\u70B9(c)\uFF1A\u6CA1\u6709\u707C\u71C3\u6807\u8BB0\u7684\u89D2\u8272\u53D7\u5230\u5C5E\u6027\u4F24\u5BB3\u65F6\uFF0C\u6B64\u4F24\u5BB3+1\u3002",
          diy014_liaoyuan_watch: "\u71CE\u539F",
          "diy014_liaoyuan_watch_info": "\u71CE\u539F\uFF1A\u4EE3\u7406\u9020\u6210\u4F24\u5BB3\u540E\uFF0C\u4EE4\u53D7\u5230\u4F24\u5BB3\u7684\u89D2\u8272+5\u707C\u71C3\uFF1B\u4EE3\u7406\u91CD\u83B7\u707C\u71C3\u540E\u5931\u6548\u3002",
          diy014_chongran_skip: "\u91CD\u71C3",
          "diy014_chongran_skip_info": "\u91CD\u71C3\u2460\uFF1A\u8DF3\u8FC7 \u51FA\u724C/\u5F03\u724C \u9636\u6BB5\u3002",
          diy014_chongran_ban: "\u91CD\u71C3",
          "diy014_chongran_ban_info": "\u91CD\u71C3\u2460\uFF1A\u4E0D\u80FD\u4F7F\u7528\u3010\u6843\u3011\u548C\u3010\u9152\u3011\u3002",
          diy014_chongran_turn: "\u91CD\u71C3",
          "diy014_chongran_turn_info": "\u91CD\u71C3\u2460\uFF1A\u56DE\u5408\u5F00\u59CB\u65F6\u56DE\u590D1\u70B9\u4F53\u529B\u5E76\u5F03\u7F6E\u4E00\u5F20\u724C\u3002",
          diy014_chongran_recover: "\u91CD\u71C3",
          "diy014_chongran_recover_info": "\u91CD\u71C3\u2461\uFF1A\u4F53\u529B\u56DE\u590D\u81F3\u4E0A\u9650\u65F6\uFF0C\u9000\u91CD\u71C3+\u653B\u8303\u56F4\u4ED6\u4EBA\u5404+40\u707C\u71C3+\u64782\u3002",
          // 灼燃 标记
          diy014_zhuoran_mark: "\u707C\u71C3",
          "diy014_zhuoran_mark_info": "\u707C\u71C3\uFF1A\u8FBE\u5230100\u65F6\u53D7\u52301\u70B9\u65E0\u6765\u6E90\u706B\u7130\u4F24\u5BB3\u5E76\u79FB\u9664\uFF1B\u65E0\u6807\u8BB0\u8005\u53D7\u5C5E\u6027\u4F24\u5BB3+1\u3002",
          // 重燃 状态标记
          diy014_chongran_mark: "\u91CD\u71C3",
          "diy014_chongran_mark_info": "\u91CD\u71C3\u72B6\u6001\uFF1A\u8DF3\u8FC7\u51FA\u724C/\u5F03\u724C\u9636\u6BB5\uFF0C\u4E0D\u80FD\u4F7F\u7528\u3010\u6843\u3011\u3010\u9152\u3011\uFF1B\u56DE\u5408\u5F00\u59CB\u56DE\u590D1\u70B9\u4F53\u529B\u5E76\u5F03\u4E00\u5F20\u724C\uFF1B\u4F53\u529B\u56DE\u6EE1\u65F6\u9000\u51FA\u3002"
        }
      },
      intro: "v1.3\uFF1A\u70DB\u714C\uFF08diy014_zhuoran\uFF09\xB7 \u7FA4/4\u8840 \xB7 \u56DB\u6280\u95ED\u73AF\uFF08\u706B\u5C5E\u6027\u653E\u706B + \u707C\u70E7\u96EA\u7403 + \u590D\u6D3B\u7EED\u822A\uFF09\u3002\u3014v1.3 \u4FEE\u590D\u4E09\u95EE\u9898\u3015\u2460\u7194\u70B9(a)\u300C\u4F60\u7684\u56DE\u5408\u5F00\u59CB\u300D\u4E0D\u89E6\u53D1\uFF1Aplayer \u89D2\u8272 trigger \u6539 global+filter\uFF0C\u4E14\u5F15\u7206\u540E removeZhuoRan \u771F\u6B63\u6E05 storage \u4F7F\u8865\u6807\u751F\u6548\uFF1B\u2461\u71CE\u539F\u4EE3\u7406\u53EA\u9996\u51FB +5\uFF1AunmarkSkill \u539F\u4E0D\u5220 storage \u2192 hasZhuoRan \u6052\u771F \u2192 \u4EE3\u7406\u9996\u51FB\u540E\u5373\u5931\u6548\uFF1B\u6539 removeZhuoRan \u663E\u5F0F\u5220 storage + \u6807\u8BB0 onunmark\uFF1B\u2462\u91CD\u71C3\u65B0\u589E\u53EF\u89C1\u72B6\u6001\u6807\u8BB0 diy014_chongran_mark\uFF08\u8FDB\u72B6\u6001\u663E\u793A\u3001\u9000\u72B6\u6001\u79FB\u9664\uFF0C\u7C7B\u4F3C\u7FFB\u9762\u72B6\u6001\u4F46\u65E0\u7FFB\u9762\u673A\u5236\u526F\u4F5C\u7528\uFF09\u3002\u3014\u4FEE\u590D v1.2\xB7Z1 \u707C\u71C3\u4E0D\u53EF\u89C1\u3015\u707C\u71C3\u6539\u4E3A\u65E0\u540D\u6740\u539F\u751F\u53EF\u89C1\u6807\u8BB0\uFF08lib.skill[diy014_zhuoran_mark]={mark:true,markcount}\uFF0C\u6570\u503C\u5B9E\u65F6\u6E32\u67D3\u89D2\u6807\uFF09\uFF0C\u7194\u70B9(a)\u5F00\u6237/\u672C\u6E90\u2461+20/\u71CE\u539F/+40 \u7ECF markSkill/unmarkSkill \u7EF4\u62A4\uFF0C\u6E38\u620F\u5185\u53EF\u89C1\u7D2F\u79EF\u4E0E\u5F15\u7206\u3002\u903B\u8F91\u8BED\u4E49\u4E0D\u53D8\uFF1Aundefined=\u65E0\u6807\u8BB0\uFF0C0=\u6709\u6807\u8BB0\u503C0\u3002\u672C\u6E90\uFF08\u9501\u5B9A\uFF09\uFF1A\u4F60\u9020\u6210\u4F24\u2192\u706B\u7130\uFF08\u7A7F\u9632\uFF09\uFF1B\u53D7\u706B\u7130-1\uFF1B\u5BF9\u6709\u707C\u71C3\u7684\u5176\u4ED6\u89D2\u8272\u4F24\u540E+20\u3002\u7194\u70B9\uFF08\u9501\u5B9A\uFF09\uFF1A\u5F00\u5C40&\u56DE\u5408\u59CB\u5168\u573A\u5F00\u6237(\u503C0)\uFF1B\u2265100\u5F15\u7206(1\u706B\u65E0\u6E90+\u79FB\u9664)\uFF1B\u65E0\u6807\u8BB0\u8005\u53D7\u5C5E\u6027\u4F24+1\u3002\u71CE\u539F\uFF08\u4E3B\u52A8\uFF09\uFF1A\u51FA\u724C\u96501\uFF0C\u5F031\u724C\u79FB\u96641\u4EBA\u707C\u71C3\uFF0C\u5176\u4F24\u540E\u53D7\u5BB3\u8005+5\uFF08\u4EE3\u7406\u91CD\u83B7\u707C\u71C3\u5931\u6548\uFF09\u3002\u91CD\u71C3\uFF08\u9501\u5B9A\uFF09\uFF1A\u81F4\u547D\u4F24&\u672A\u91CD\u71C3\u2192\u9632\u4F24+\u56DE1+\u8FDB\u91CD\u71C3(\u8DF3\u9636\u6BB5/\u7981\u6843\u9152/\u56DE\u5408\u59CB\u56DE1\u5F031)\uFF1B\u56DE\u6EE1\u2192\u9000\u91CD\u71C3+\u653B\u8303\u56F4\u4ED6\u4EBA\u5404+40+\u64782\u3002\u5B9E\u73B0\u8981\u70B9\uFF08\u5DF2\u5BF9\u7167\u672C\u4F53\u6838\u5B9E\uFF09\uFF1A\u707C\u71C3\u4E3A\u72EC\u7ACB\u6570\u503C storage[diy014_zhuoran_mark]\uFF08\u539F\u751F\u53EF\u89C1\u6807\u8BB0\uFF0C\u975E countMark\uFF0C\u53EF\u8868\u8FBE\u503C0\u6709\u6807\u8BB0\uFF09\uFF1B\u4F24\u5BB3\u9636\u6BB5\u7528 damageBegin1/4 + damageAfter\uFF1B\u65E0\u6E90\u4F24\u5BB3\u7528 nosource:true\uFF1B\u8DF3\u9636\u6BB5\u7528 trigger.cancel()\uFF1B\u56DE\u6EE1\u7528 changeHp \u4E8B\u4EF6\uFF1B\u5F15\u7206 nosource \u4E0D\u89E6\u53D1\u672C\u6E90\u2461/\u7194\u70B9c\uFF0C\u65E0\u81EA\u5FAA\u73AF\u3002\u3014v1.1 \u4FEE\u590D QA \u62A5\u544A F2/F3\u3015\u71CE\u539F used \u6539\u4E3A\u6BCF\u56DE\u5408\uFF08\u7194\u70B9a\u5F00\u6237\u65F6\uFF09\u91CD\u7F6E\u2192\u771F\u6B63\u51FA\u724C\u9636\u6BB5\u9650\u4E00\u6B21/\u6BCF\u56DE\u5408\uFF1B\u71CE\u539F\u6539\u4E3A\u5148\u9009\u4EE3\u7406\u540E\u5F03\u724C\uFF08\u53D6\u6D88\u4EE3\u7406\u4E0D\u767D\u4E22\u724C\u3001\u4E0D\u8BA1used\uFF09\uFF1B\u91CD\u71C3\u9000\u72B6\u6001\u5F53\u56DE\u5408\u4E0D\u518D\u5F3A\u5236\u5F03\u724C\u2192\u9000\u51FA\u51C0\u64782\u3002F1(\u7194\u70B9c+1\u53E3\u5F84)/F4(\u91CD\u71C3\u4E00\u6B21\u6027\u9632\u4F24)/F5(damageBegin4\u987A\u5E8F) \u4E3A\u8BBE\u8BA1\u53E3\u5F84\u6216\u5B9E\u6218\u6781\u7A84\uFF0C\u5F85\u9700\u6C42\u65B9\u62CD\u677F\uFF0C\u672A\u6539\u673A\u5236\u3002\u3014\u5F85\u786E\u8BA4\u3015\u9ED8\u8BA4\u53E3\u5F84\uFF1A\u7194\u70B9a\u521D\u503C0 / \u6BCF\u6B21\u52A0\u503C\u5373\u65F6\u5F15\u7206 / \u7194\u70B9c\u4EFB\u610F\u5C5E\u6027 / \u91CD\u71C3\u2461\u56DE\u6EE1=\u4EFB\u610F\u4F7Fhp\u8FBEmax / \u653B\u8303\u56F4\u542B\u6B66\u5668\u52A0\u6210 / \u71CE\u539F\u5931\u6548=\u4EE3\u7406\u91CD\u83B7\u6807\u8BB0 / \u4EE3\u7406\u4EFB\u610F\u4F24\u5BB3 / \u7FA4\u75374\u8840\u3002",
      author: "\u4F60\u7684\u540D\u5B57",
      diskURL: "",
      forumURL: "",
      version: "1.3"
    },
    files: { character: [], card: [], skill: [], audio: [] }
  };
}

// ../_workbuddy_tmp/v41_build/m10.js
import { game as game7, get as get10, _status as _status5 } from "noname";
function index_default10() {
  return {
    name: "diy018_fuchouzhe",
    connect: false,
    editable: false,
    // ★ v1.8.3 回归修复：content() 必须存在，哪怕函数体为空。
    //   game/index.js:3162 只有 `if (content)` 才把扩展 push 进 lib.extensions；
    //   而 lib.extensions 是 loading.ts:loadExtension 遍历、注册 package.character
    //   的唯一来源。v1.8 拆除 createEvent 包装时误删了整个 content()，
    //   导致扩展管理里能看到名字，但武将 / 武将包 / 称号全部不注册（导入一直"失败"）。
    //   正式包 10 个可正常显示的扩展全部带 content()，v1.0~v1.7 也都有。
    content() {
    },
    package: {
      character: {
        character: {
          diy018_fuchouzhe: {
            sex: "male",
            group: "qun",
            hp: 4,
            maxHp: 4,
            skills: ["diy018_revenge", "diy018_chongfeng", "diy018_buqu"],
            // 立绘：扩展内图片须走 extension/ 前缀（v1.8.1 补；350x464 竖版）
            img: "extension/diy018_fuchouzhe/image/character/diy018_fuchouzhe.jpg"
          }
        },
        translate: {
          diy018_fuchouzhe: "\u590D\u4EC7\u8005"
        },
        // 称号：引擎 get.characterTitle 读 lib.characterTitle[武将ID]；
        // loadCharacter 的 default 分支会把 package.character 下的这个键合并进 lib.characterTitle。
        // "#r" = fire 红色（get.colorspan），与「复仇红刀」呼应；不写则武将详情里称号为空。
        characterTitle: {
          diy018_fuchouzhe: "#r\u590D\u4EC7\u7EA2\u5200"
        }
      },
      skill: {
        skill: {
          // ================= 复仇（锁定技 · 低血条件 + 杀无距离 + 记仇加伤）=================
          // ★ v1.5：新文本删去「首次」「永久进入复仇形态」→ 语义由「一次性觉醒」
          //   改为「常态条件」：只要当前 hp ≤ floor(maxHp/2) 就生效，回血超过阈值即失效。
          //   故不再写 storage 标记，所有效果实时判定。
          diy018_revenge: {
            charlotte: true,
            // 无距离杀：当前体力 ≤ floor(上限/2)，或本次冲锋
            mod: {
              attackRange(card, player) {
                if (get10.name(card) !== "sha") return;
                if (player.hp <= Math.floor(player.maxHp / 2) || player.storage["diy018_cf_norange"]) return 100;
              }
            },
            group: ["diy018_revenge_mark", "diy018_revenge_dmg"]
          },
          // 记仇：记录曾对复仇者造成伤害的角色
          diy018_revenge_mark: {
            charlotte: true,
            hidden: true,
            trigger: { player: "damageAfter" },
            forced: true,
            filter(event, player) {
              const s = event.source;
              return !!(s && s !== player && s.playerid != null && event.num > 0);
            },
            content(event, trigger, player) {
              const s = trigger.source;
              if (!s || s === player) return;
              if (!player.storage["diy018_revenge_targets"]) player.storage["diy018_revenge_targets"] = [];
              if (player.storage["diy018_revenge_targets"].indexOf(s.playerid) < 0) {
                player.storage["diy018_revenge_targets"].push(s.playerid);
              }
            }
          },
          // 伤害结算：冲锋基础伤害（=弃牌数） + 复仇对记仇目标的【杀】+1
          diy018_revenge_dmg: {
            charlotte: true,
            hidden: true,
            trigger: { source: "damageBegin4" },
            forced: true,
            filter(event, player) {
              if (event.source !== player) return false;
              if (!event.card || get10.name(event.card) !== "sha") return false;
              if (player.storage["diy018_cf_damage"] > 0) return true;
              if (!(player.hp <= Math.floor(player.maxHp / 2))) return false;
              const victim = event.player;
              if (!victim) return false;
              return (player.storage["diy018_revenge_targets"] || []).indexOf(victim.playerid) >= 0;
            },
            content(event, trigger, player) {
              if (player.storage["diy018_cf_damage"] > 0) {
                trigger.num += player.storage["diy018_cf_damage"] - 1;
              }
              if (player.hp <= Math.floor(player.maxHp / 2)) {
                const victim = trigger.player;
                if (victim && (player.storage["diy018_revenge_targets"] || []).indexOf(victim.playerid) >= 0) {
                  trigger.num += 1;
                }
              }
            }
          },
          // ================= 冲锋（主动技 · 出牌阶段限一次 · 弃牌数伤害）=================
          diy018_chongfeng: {
            enable: "phaseUse",
            usable: 1,
            filter(event, player) {
              if (player.countCards("h") < 1) return false;
              return game7.players.some((p) => p !== player && p.isAlive());
            },
            filterTarget(card, player, target) {
              return target !== player && target.isAlive();
            },
            async content(event, trigger, player) {
              const target = event.targets && event.targets[0];
              if (!target) return;
              const ctrl = await player.chooseControl(["\u666E\u901A\u6740", "\u96F7\u5C5E\u6027\u6740", "\u706B\u5C5E\u6027\u6740"]).set("prompt", "\u51B2\u950B\uFF1A\u9009\u62E9\u6B64\u3010\u6740\u3011\u7684\u5C5E\u6027").set("ai", () => 0).forResult();
              const choice = ctrl && ctrl.control;
              if (choice !== "\u666E\u901A\u6740" && choice !== "\u96F7\u5C5E\u6027\u6740" && choice !== "\u706B\u5C5E\u6027\u6740") return;
              const nature = choice === "\u96F7\u5C5E\u6027\u6740" ? "thunder" : choice === "\u706B\u5C5E\u6027\u6740" ? "fire" : null;
              const max = player.countCards("h");
              const r = await player.chooseToDiscard("\u51B2\u950B\uFF1A\u5F03\u7F6E\u82E5\u5E72\u5F20\u724C\uFF08\u4F24\u5BB3=\u5F03\u7F6E\u6570\uFF09", [1, max], true).forResult();
              const cards = r && r.cards || [];
              if (!cards.length) return;
              player.storage["diy018_cf_damage"] = cards.length;
              player.storage["diy018_cf_norange"] = true;
              try {
                await player.useCard(nature ? { name: "sha", nature } : { name: "sha" }, target);
              } finally {
                player.storage["diy018_cf_damage"] = 0;
                player.storage["diy018_cf_norange"] = false;
              }
            },
            ai: {
              order: 7,
              result: { player: 1 }
            }
          },
          // ================= 不屈（限定技 · 免死 + 技能摸牌 + 回合末流失 X）=================
          diy018_buqu: {
            limited: true,
            unique: true,
            charlotte: true,
            trigger: { player: "damageBegin4" },
            forced: false,
            filter(event, player) {
              if (player.storage["diy018_buqu_used"]) return false;
              return player.hp - (event.num || 0) <= 0;
            },
            async content(event, trigger, player) {
              const r = await player.chooseBool("\u4E0D\u5C48\uFF1A\u56DE\u590D\u81F3\u4F53\u529B\u4E0A\u9650\u4E00\u534A\uFF0C\u5E76\u83B7\u5F97\u540E\u7EED\u6548\u679C\uFF1F").set("ai", () => true).forResult();
              if (!r || r.bool !== true) return;
              trigger.num = 0;
              const half = Math.ceil(player.maxHp / 2);
              await player.changeHp(half - player.hp);
              player.storage["diy018_buqu_active"] = true;
              player.storage["diy018_buqu_used"] = true;
              player.storage["diy018_buqu_dmg"] = {};
            },
            group: ["diy018_buqu_use", "diy018_buqu_record", "diy018_buqu_turnstart", "diy018_buqu_turnend"]
          },
          // 不屈①：曾伤害过你的角色使用基本牌 / 普通锦囊牌时摸牌；【火杀】摸 2 张
          // ★ v1.8.4：按需求方新文本整句替换「【杀】进入弃牌堆」。
          //   触发者复用【复仇】维护的永久记仇名单 diy018_revenge_targets。
          //   引擎 get.type(card)：基本牌 "basic"、普通锦囊 "trick"、
          //   延时锦囊 "delay"（get/index.js:3380 只在 method=="trick" 时才把 delay 归为 trick）、
          //   装备 "equip" → 只收 basic / trick 即「基本牌 + 非延时普通锦囊」。
          //   ★ 非 async 的 filter/content 会被 StepCompiler 剥闭包，函数体全内联。
          diy018_buqu_use: {
            charlotte: true,
            hidden: true,
            trigger: { global: "useCard" },
            forced: true,
            filter(event, player) {
              if (!player.storage["diy018_buqu_active"]) return false;
              const actor = event.player;
              if (!actor || actor === player) return false;
              if ((player.storage["diy018_revenge_targets"] || []).indexOf(actor.playerid) < 0) return false;
              const card = event.card;
              if (!card) return false;
              const t = get10.type(card);
              return t === "basic" || t === "trick";
            },
            content(event, trigger, player) {
              const card = trigger.card;
              if (!card) return;
              const nm = get10.name(card);
              const fire = nm === "huosha" || nm === "sha" && get10.nature(card) === "fire";
              player.draw(fire ? 2 : 1);
            }
          },
          // 不屈②：记录本回合对单个角色造成的最高伤害
          diy018_buqu_record: {
            charlotte: true,
            hidden: true,
            trigger: { source: "damageAfter" },
            forced: true,
            filter(event, player) {
              if (!player.storage["diy018_buqu_active"]) return false;
              if (event.source !== player || !event.player) return false;
              if (!(event.num > 0)) return false;
              return _status5.currentPhase === player;
            },
            content(event, trigger, player) {
              const victim = trigger.player;
              if (!victim) return;
              const rec = player.storage["diy018_buqu_dmg"] || (player.storage["diy018_buqu_dmg"] = {});
              const key = victim.playerid;
              if (!rec[key] || trigger.num > rec[key]) rec[key] = trigger.num;
            }
          },
          // 不屈③：你的回合开始 → 清空本期记录
          diy018_buqu_turnstart: {
            charlotte: true,
            hidden: true,
            trigger: { global: "phaseZhunbeiBegin" },
            forced: true,
            filter(event, player) {
              return !!player.storage["diy018_buqu_active"] && event.player === player;
            },
            content(event, trigger, player) {
              player.storage["diy018_buqu_dmg"] = {};
            }
          },
          // 不屈④：你的回合结束 → 流失 X 点体力（X = 本回合对单名角色造成的最高伤害）
          diy018_buqu_turnend: {
            charlotte: true,
            hidden: true,
            trigger: { global: "phaseJieshuBegin" },
            forced: true,
            filter(event, player) {
              return !!player.storage["diy018_buqu_active"] && event.player === player;
            },
            async content(event, trigger, player) {
              const rec = player.storage["diy018_buqu_dmg"] || {};
              let x = 0;
              for (const key in rec) {
                if (rec[key] > x) x = rec[key];
              }
              player.storage["diy018_buqu_dmg"] = {};
              if (x > 0) {
                game7.log(player, "\u56E0\u4E0D\u5C48\u6D41\u5931\u4E86", "#y" + x, "\u70B9\u4F53\u529B");
                await player.loseHp(x);
              }
            }
          }
        },
        translate: {
          diy018_fuchouzhe: "\u590D\u4EC7\u8005",
          diy018_revenge: "\u590D\u4EC7",
          "diy018_revenge_info": "\u9501\u5B9A\u6280\uFF0C\u5F53\u4F60\u7684\u4F53\u529B\u503C\u4E0D\u5927\u4E8E\u4F60\u7684\u4F53\u529B\u4E0A\u9650\u7684\u4E00\u534A\uFF08\u5411\u4E0B\u53D6\u6574\uFF09\u65F6\uFF0C\u4F60\u83B7\u5F97\u4EE5\u4E0B\u6548\u679C\uFF1A\u4F60\u4F7F\u7528\u3010\u6740\u3011\u65E0\u8DDD\u79BB\u9650\u5236\uFF1B\u4F60\u5BF9\u66FE\u5BF9\u4F60\u9020\u6210\u8FC7\u4F24\u5BB3\u7684\u89D2\u8272\u4F7F\u7528\u3010\u6740\u3011\u9020\u6210\u7684\u4F24\u5BB3+1\u3002",
          diy018_chongfeng: "\u51B2\u950B",
          "diy018_chongfeng_info": "\u4E3B\u52A8\u6280\uFF0C\u51FA\u724C\u9636\u6BB5\u9650\u4E00\u6B21\uFF0C\u4F60\u53EF\u4EE5\u5F03\u7F6E\u82E5\u5E72\u5F20\u724C\u5E76\u9009\u62E9\u6B64\u3010\u6740\u3011\u7684\u5C5E\u6027\uFF08\u666E\u901A/\u96F7/\u706B\uFF09\uFF0C\u89C6\u4E3A\u5BF9\u4E00\u540D\u5176\u4ED6\u89D2\u8272\u4F7F\u7528\u4E00\u5F20\u4F24\u5BB3\u4E3A\u4F60\u5F03\u7F6E\u724C\u6570\u91CF\u7684\u3010\u6740\u3011\uFF08\u6B64\u3010\u6740\u3011\u65E0\u8DDD\u79BB\u9650\u5236\uFF09\u3002",
          diy018_buqu: "\u4E0D\u5C48",
          "diy018_buqu_info": "\u9650\u5B9A\u6280\uFF0C\u5F53\u4F60\u56E0\u53D7\u5230\u4F24\u5BB3\u800C\u8FDB\u5165\u6FD2\u6B7B\u72B6\u6001\u65F6\uFF0C\u4F60\u53EF\u4EE5\u5C06\u4F53\u529B\u56DE\u590D\u81F3\u4F53\u529B\u4E0A\u9650\u7684\u4E00\u534A\uFF08\u5411\u4E0A\u53D6\u6574\uFF09\uFF0C\u7136\u540E\u83B7\u5F97\u4EE5\u4E0B\u6548\u679C\uFF1A\u2460\u6BCF\u5F53\u66FE\u5BF9\u4F60\u9020\u6210\u8FC7\u4F24\u5BB3\u7684\u89D2\u8272\u4F7F\u7528\u4E00\u5F20\u57FA\u672C\u724C\u6216\u666E\u901A\u9526\u56CA\u724C\u65F6\uFF0C\u4F60\u6478\u4E00\u5F20\u724C\uFF0C\u82E5\u5176\u4F7F\u7528\u7684\u662F\u3010\u706B\u6740\u3011\uFF0C\u6539\u4E3A\u4F60\u6478\u4E24\u5F20\u724C\uFF1B\u2461\u4F60\u7684\u56DE\u5408\u7ED3\u675F\u65F6\uFF0C\u4F60\u6D41\u5931 X \u70B9\u4F53\u529B\uFF0CX \u4E3A\u4F60\u672C\u56DE\u5408\u5BF9\u4E00\u540D\u89D2\u8272\u9020\u6210\u7684\u6700\u9AD8\u4F24\u5BB3\u3002",
          diy018_revenge_mark: "\u590D\u4EC7",
          "diy018_revenge_mark_info": "\u590D\u4EC7\uFF1A\u8BB0\u5F55\u66FE\u5BF9\u4F60\u9020\u6210\u4F24\u5BB3\u7684\u89D2\u8272\u3002",
          diy018_revenge_dmg: "\u590D\u4EC7",
          "diy018_revenge_dmg_info": "\u590D\u4EC7\uFF1A\u4F53\u529B\u503C\u4E0D\u5927\u4E8E\u4E0A\u9650\u4E00\u534A\uFF08\u5411\u4E0B\u53D6\u6574\uFF09\u65F6\uFF0C\u5BF9\u8BB0\u4EC7\u89D2\u8272\u7684\u3010\u6740\u3011\u4F24\u5BB3+1\uFF1B\u51B2\u950B\u6740\u7684\u57FA\u7840\u4F24\u5BB3=\u5F03\u7F6E\u724C\u6570\u3002",
          diy018_buqu_use: "\u4E0D\u5C48",
          "diy018_buqu_use_info": "\u4E0D\u5C48\uFF1A\u66FE\u4F24\u5BB3\u8FC7\u4F60\u7684\u89D2\u8272\u4F7F\u7528\u57FA\u672C\u724C\u6216\u666E\u901A\u9526\u56CA\u724C\u65F6\u6478\u4E00\u5F20\u724C\uFF0C\u4F7F\u7528\u3010\u706B\u6740\u3011\u5219\u6478\u4E24\u5F20\u724C\u3002",
          diy018_buqu_record: "\u4E0D\u5C48",
          "diy018_buqu_record_info": "\u4E0D\u5C48\uFF1A\u8BB0\u5F55\u672C\u56DE\u5408\u5BF9\u5355\u4E2A\u89D2\u8272\u9020\u6210\u7684\u6700\u9AD8\u4F24\u5BB3\u3002",
          diy018_buqu_turnstart: "\u4E0D\u5C48",
          "diy018_buqu_turnstart_info": "\u4E0D\u5C48\uFF1A\u56DE\u5408\u5F00\u59CB\u6E05\u7A7A\u4F24\u5BB3\u8BB0\u5F55\u3002",
          diy018_buqu_turnend: "\u4E0D\u5C48",
          "diy018_buqu_turnend_info": "\u4E0D\u5C48\uFF1A\u56DE\u5408\u7ED3\u675F\u6D41\u5931 X \u70B9\u4F53\u529B\u3002"
        }
      }
    },
    intro: "\u590D\u4EC7\u8005(diy018_fuchouzhe) \xB7 \u7FA4/4\u8840\u3002\u3014v1.8.4 \u4E0D\u5C48\u2460\u6539\u5224\u4F7F\u7528\u724C\u3015\u6539\u4E3A\u300C\u66FE\u4F24\u5BB3\u8FC7\u4F60\u7684\u89D2\u8272\u4F7F\u7528\u57FA\u672C\u724C\u6216\u666E\u901A\u9526\u56CA\u724C\u65F6\u6478\u4E00\u5F20\uFF0C\u3010\u706B\u6740\u3011\u6478\u4E24\u5F20\u300D\uFF0C\u590D\u7528\u3010\u590D\u4EC7\u3011\u6C38\u4E45\u8BB0\u4EC7\u540D\u5355\uFF0C\u4E0D\u8BBE\u6BCF\u56DE\u5408\u4E0A\u9650\uFF1B\u79FB\u9664\u5F03\u724C\u5806\u4E09\u4E8B\u4EF6\u76D1\u542C\u3002\u3014v1.8.3 \u4FEE\u590D\u5BFC\u5165\u5931\u8D25\u3015\u8865\u56DE\u88AB v1.8 \u8BEF\u5220\u7684\u9876\u5C42 content()\uFF08\u5F15\u64CE\u8981\u6C42\u5B83\u5B58\u5728\u624D\u4F1A\u628A\u6269\u5C55\u52A0\u5165 lib.extensions \u5E76\u6CE8\u518C\u6B66\u5C06\u5305\uFF09\u3002\u3014v1.8.2 \u8865\u79F0\u53F7\u3015\u79F0\u53F7\u300C\u590D\u4EC7\u7EA2\u5200\u300D\u7ECF package.character.characterTitle \u6CE8\u518C\u5230 lib.characterTitle\uFF08\u6B64\u524D\u6B66\u5C06\u8BE6\u60C5\u79F0\u53F7\u4E3A\u7A7A\uFF09\u3002\u3014v1.8.1 \u8865\u7ACB\u7ED8\u3015\u65B0\u589E 350\xD7464 \u7AD6\u7248\u7ACB\u7ED8\uFF0C\u5E76\u5728 character \u5B9A\u4E49\u4E2D\u6CE8\u518C img \u8DEF\u5F84\uFF08\u6B64\u524D\u7F3A img \u5B57\u6BB5\uFF0C\u662F\u552F\u4E00\u6CA1\u6709\u7ACB\u7ED8\u7684\u6269\u5C55\uFF09\u3002\u3014v1.8 \u4E0D\u5C48\u6539\u5224\u5F03\u724C\u5806\u3015\u6309\u65B0\u6587\u672C\u628A\u300C\u6280\u80FD\u53D1\u52A8\u6478\u724C\u300D\u6574\u53E5\u66FF\u6362\u4E3A\u300C\u3010\u6740\u3011\u8FDB\u5165\u5F03\u724C\u5806\u64781\u5F20\u3001\u3010\u706B\u6740\u3011\u64782\u5F20\u300D\uFF0Cv1.4~v1.6 \u4E3A\u65E7\u673A\u5236\u5EFA\u7ACB\u7684 game.createEvent \u5305\u88C5\uFF08\u4E8B\u4EF6\u9ED1\u540D\u5355/\u91CD\u5165\u9501/\u6BCF\u56DE\u54085\u5F20\u4E0A\u9650/\u7956\u5148\u94FE\u6807\u8BB0\uFF09\u5168\u90E8\u62C6\u9664\u3002\u3014v1.7 \u51B2\u950B\u53EF\u9009\u6740\u5C5E\u6027\u3015\u3014v1.5 \u590D\u4EC7\u6539\u4E3A\u5B9E\u65F6\u4F4E\u8840\u6761\u4EF6\u3015\u3014v1.2 \u5B58\u50A8\u952E\u5B57\u9762\u91CF\u5316\u4EE5\u89C4\u907F StepCompiler \u4E22\u95ED\u5305\u3015\u3002\u590D\u4EC7\uFF08\u9501\u5B9A\u6280\uFF09\uFF1A\u5F53\u4F60\u7684\u4F53\u529B\u503C\u4E0D\u5927\u4E8E\u4F60\u7684\u4F53\u529B\u4E0A\u9650\u7684\u4E00\u534A\uFF08\u5411\u4E0B\u53D6\u6574\uFF09\u65F6\uFF0C\u4F60\u83B7\u5F97\u4EE5\u4E0B\u6548\u679C\uFF1A\u4F60\u4F7F\u7528\u3010\u6740\u3011\u65E0\u8DDD\u79BB\u9650\u5236\uFF1B\u4F60\u5BF9\u66FE\u5BF9\u4F60\u9020\u6210\u8FC7\u4F24\u5BB3\u7684\u89D2\u8272\u4F7F\u7528\u3010\u6740\u3011\u9020\u6210\u7684\u4F24\u5BB3+1\u3002\u51B2\u950B\uFF08\u4E3B\u52A8\u6280\uFF09\uFF1A\u51FA\u724C\u9636\u6BB5\u9650\u4E00\u6B21\uFF0C\u4F60\u53EF\u4EE5\u5F03\u7F6E\u82E5\u5E72\u5F20\u724C\u5E76\u9009\u62E9\u6B64\u3010\u6740\u3011\u7684\u5C5E\u6027\uFF08\u666E\u901A/\u96F7/\u706B\uFF09\uFF0C\u89C6\u4E3A\u5BF9\u4E00\u540D\u5176\u4ED6\u89D2\u8272\u4F7F\u7528\u4E00\u5F20\u4F24\u5BB3\u4E3A\u4F60\u5F03\u7F6E\u724C\u6570\u91CF\u7684\u3010\u6740\u3011\uFF08\u6B64\u3010\u6740\u3011\u65E0\u8DDD\u79BB\u9650\u5236\uFF09\u3002\u4E0D\u5C48\uFF08\u9650\u5B9A\u6280\uFF09\uFF1A\u5F53\u4F60\u56E0\u53D7\u5230\u4F24\u5BB3\u800C\u8FDB\u5165\u6FD2\u6B7B\u72B6\u6001\u65F6\uFF0C\u4F60\u53EF\u4EE5\u5C06\u4F53\u529B\u56DE\u590D\u81F3\u4F53\u529B\u4E0A\u9650\u7684\u4E00\u534A\uFF08\u5411\u4E0A\u53D6\u6574\uFF09\uFF0C\u7136\u540E\u83B7\u5F97\u4EE5\u4E0B\u6548\u679C\uFF1A\u2460\u6BCF\u5F53\u66FE\u5BF9\u4F60\u9020\u6210\u8FC7\u4F24\u5BB3\u7684\u89D2\u8272\u4F7F\u7528\u4E00\u5F20\u57FA\u672C\u724C\u6216\u666E\u901A\u9526\u56CA\u724C\u65F6\uFF0C\u4F60\u6478\u4E00\u5F20\u724C\uFF0C\u82E5\u5176\u4F7F\u7528\u7684\u662F\u3010\u706B\u6740\u3011\uFF0C\u6539\u4E3A\u4F60\u6478\u4E24\u5F20\u724C\uFF1B\u2461\u4F60\u7684\u56DE\u5408\u7ED3\u675F\u65F6\uFF0C\u4F60\u6D41\u5931 X \u70B9\u4F53\u529B\uFF0CX \u4E3A\u4F60\u672C\u56DE\u5408\u5BF9\u4E00\u540D\u89D2\u8272\u9020\u6210\u7684\u6700\u9AD8\u4F24\u5BB3\u3002",
    author: "\u4F60\u7684\u540D\u5B57",
    diskURL: "",
    forumURL: "",
    version: "1.8.4",
    files: { character: [], card: [], skill: [], audio: [] }
  };
}

// ../_workbuddy_tmp/v41_build/merge_entry.js
var PACK_NAME = "myhero";
var mods = [index_default, index_default2, index_default3, index_default4, index_default5, index_default6, index_default7, index_default8, index_default9, index_default10];
function normalizeImg(img) {
  if (!img || !/image\/character\//.test(img)) return img;
  return "extension/" + PACK_NAME + "/image/character/" + img.split("/").pop();
}
function mergePackage(defs) {
  const out = {};
  const skip = ["intro", "author", "diskURL", "forumURL", "version"];
  for (const d of defs) {
    const pk = d && d.package;
    if (!pk) continue;
    for (const k of Object.keys(pk)) {
      if (skip.indexOf(k) >= 0) continue;
      const v = pk[k];
      if (!v || typeof v !== "object" || Array.isArray(v)) continue;
      if (!out[k]) out[k] = {};
      for (const k2 of Object.keys(v)) {
        const v2 = v[k2];
        const prev = out[k][k2];
        if (v2 && typeof v2 === "object" && !Array.isArray(v2) && prev && typeof prev === "object" && !Array.isArray(prev)) {
          out[k][k2] = Object.assign({}, prev, v2);
        } else if (prev === void 0) {
          out[k][k2] = v2;
        }
      }
    }
  }
  return out;
}
var type = "extension";
function index_default_v41() {
  const defs = mods.map((f) => f());
  const pkg = mergePackage(defs);
  const chars = pkg.character && pkg.character.character;
  if (chars) {
    for (const id of Object.keys(chars)) {
      const c = chars[id];
      if (c && typeof c === "object") {
        c.img = c.img ? normalizeImg(c.img) : "extension/" + PACK_NAME + "/image/character/" + id + ".jpg";
      }
    }
  }
  return {
    name: PACK_NAME,
    author: "\u4F60\u7684\u540D\u5B57",
    version: "4.1.1",
    connect: false,
    editable: false,
    content() {
    },
    package: pkg,
    intro: "\u6211\u7684\u82F1\u96C4\u6740 v4.1.1 \u6574\u5408\u5305 \xB7 \u5355\u6269\u5C55\u5185\u542B 10 \u540D DIY \u6B66\u5C06\uFF1A\u62C9\u739B\u5239\u3001\u6F5C\u3001\u5947\u7075\u738B\u3001\u9B54\u865A\u7F57\u3001\u4E94\u6761\u609F\u3001\u9065\u3001\u4E4C\u5C14\u6BD4\u5B89\u3001\u529B\u91CF\u738B\u3001\u70DB\u714C\u3001\u590D\u4EC7\u8005\u3002\u7531 v4.0\uFF08\u65E9\u671F\u4E94\u4F4D\uFF09\u4E0E\u6B63\u5F0F\u5305\u4E2D 5 \u4E2A\u5DF2\u5B9E\u673A\u786E\u8BA4\u7684\u72EC\u7ACB\u6269\u5C55\u5408\u5E76\u800C\u6765\uFF1B\u7ACB\u7ED8\u81EA\u5305\u542B\uFF0Cimg \u8DEF\u5F84\u7EDF\u4E00\u5F52\u4E00\u5316\u5230\u672C\u6269\u5C55\u76EE\u5F55\u3002\u5404\u6B66\u5C06\u673A\u5236\u4E0E\u5176\u72EC\u7ACB\u5305\u7248\u672C\u5B8C\u5168\u4E00\u81F4\uFF08\u89C1\u5404 \u66F4\u65B0\u65E5\u5FD7_diyXXX.md\uFF09\u3002\u6CE8\u610F\uFF1A\u672C\u6574\u5408\u5305\u4E0E\u6B63\u5F0F\u5305\u4E2D\u7684\u72EC\u7ACB\u6269\u5C55 zip \u542B\u540C\u540D\u6B66\u5C06\uFF0C\u8BF7\u52FF\u540C\u65F6\u5B89\u88C5\uFF0C\u4E8C\u9009\u4E00\u5373\u53EF\u3002",
    diskURL: "",
    forumURL: "",
    files: { character: [], card: [], skill: [], audio: [] }
  };
}
export {
  index_default_v41 as default,
  type
};
