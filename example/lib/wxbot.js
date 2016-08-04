'use strict'
const Wechat = require('../../index')
const debug = require('debug')('wxbot')
const mongoose = require('mongoose')

mongoose.connect('mongodb://139.162.38.64/wx')
let Schema = mongoose.Schema
let Emoticon = mongoose.model('Emoticon', new Schema({
  FromUserName: String,
  ToUserName: String,
  CreateTime: Date,
  Content: String
}))

class WxBot extends Wechat {

  constructor() {
    super()

    this.memberInfoList = []

    this.replyUsers = new Set()

    this.on('text-message', msg => {
      if (msg.ToUserName == 'filehelper' && msg.Content.indexOf('count') >= 0) {
        pulse()
      }
    })

    this.superviseUsers = new Set()
    this.openTimes = 0

    this.on('error', err => debug(err))

    this.on('emoticon-message', msg => {
      if (msg.Content.indexOf('md5') >= 0) {
        let instance = Emoticon()
        instance.FromUserName = msg.FromUserName
        instance.ToUserName = msg.ToUserName
        instance.CreateTime = new Date(msg.CreateTime * 1000)
        instance.Content = msg.Content
        instance.save()
        debug('new emoticon')
        if (this.replyUsers.has(msg['FromUserName'])) {
          this.sendEmoticon('0270c029bfb835242ed03c767adbe243', msg['FromUserName'])
          setTimeout(() => {
            this.sendEmoticon(msg.Content.match(/md5 ?= ?"(.*?)"/)[1], msg['FromUserName'])
          }, 1000)
          setTimeout(() => {
            this.sendMsg('是吧[微笑]', msg['FromUserName'])
          }, 2000)
        }
      }
    })
    const pulse = () => {
      Emoticon.count({}, (err, count) => {
        this.sendMsg(count, 'filehelper')
      })
    }
    let timerId = setInterval(pulse, 1000 * 60 * 5)
    this.on('logout', () => {
      clearInterval(timerId)
    })
    pulse()
  }

  get replyUsersList() {
    return this.friendList.map(member => {
      member.switch = this.replyUsers.has(member['UserName'])
      return member
    })
  }

  get superviseUsersList() {
    return this.friendList.map(member => {
      member.switch = this.superviseUsers.has(member['UserName'])
      return member
    })
  }

  _tuning(word) {
    let params = {
      'key': '2ba083ae9f0016664dfb7ed80ba4ffa0',
      'info': word
    }
    return this.request({
      method: 'GET',
      url: 'http://www.tuling123.com/openapi/api',
      params: params
    }).then(res => {
      const data = +res.data
      if (data.code === 100000) {
        return data.text + '[微信机器人]'
      }
      throw new Error('tuning返回值code错误', data)
    }).catch(err => {
      debug(err)
      return '现在思路很乱，最好联系下我哥 T_T...'
    })
  }

  _botReply(msg) {
    if (this.replyUsers.has(msg['FromUserName'])) {
      this._tuning(msg['Content']).then(reply => {
        this.sendMsg(reply, msg['FromUserName'])
        debug(reply)
      })
    }
  }

  _botSupervise() {
    const message = '我的主人玩微信' + ++this.openTimes + '次啦！'
    for (let user of this.superviseUsers.values()) {
      this.sendMsg(message, user)
      debug(message)
    }
  }

}

exports = module.exports = WxBot
