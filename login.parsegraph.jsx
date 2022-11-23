import React, {useState} from 'react'
import process from 'process'

const Page = ()=>{
  const [logins, setLogins] = useState([])
  console.log("LOGINS")
  console.log(logins.reduce((children, login)=>(
    <parsegraph dir="forward" type="u" pull="d">
      <parsegraph dir="downward" label={`Login ${login}`}/>
      {children}
    </parsegraph>
  ), null))
  return <parsegraph type="u" pull="d" onClick={()=>{
    setLogins([...logins, logins.length])
  }}>
  {logins.reduce((children, login, index)=>(
    <parsegraph dir="forward" type="u" pull="d" onClick={()=>{
      const newLogins = [...logins]
      newLogins.splice(index, 1)
      setLogins(newLogins)
    }}>
      <parsegraph dir="downward" overlay="/login"/>
      {children}
    </parsegraph>
  ), null)}
  </parsegraph>
}

module.exports = {
  default: () => {
    return <Page/>
  }
}
