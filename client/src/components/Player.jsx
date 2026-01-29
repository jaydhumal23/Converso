import { useRef } from 'react'
export default function Player() {
    const localVideo = useRef();
    const remoteVideo = useRef();
    return (

        <div className='flex gap-5'>
            <video ref={localVideo} autoPlay playsInline muted className='w-[45%]' />
            <video ref={remoteVideo} autoPlay playsInline className='w-[45%]' />
        </div>

    )
}

