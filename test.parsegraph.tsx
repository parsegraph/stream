import React, {useState} from 'react'
import process from 'process'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      parsegraph: {
        children?: (Element | boolean)[]
        dir?: string
        onClick?: ()=>void
        label?: string
        pull?: string
      };
    }
  }
}

const Page = ()=>{
  const [dreaming, setDreaming] = useState(false)
  return <parsegraph label={`Hello, ${process.cwd()}`} pull="d">
    <parsegraph dir="downward" label="Shadow"/>
    <parsegraph dir="forward" label="Ego" onClick={()=>{
      setDreaming(!dreaming)
    }}>
      <parsegraph dir="downward" label="Inner child"/>
      {dreaming && <parsegraph dir="forward" label="Dreams"/>}
    </parsegraph>
  </parsegraph>
}

module.exports = {
  default: () => {
    return <Page/>
  }
}