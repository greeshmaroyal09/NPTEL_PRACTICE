'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Leaf } from 'lucide-react'

const questions = [
  {
    question: 'In economics, what does the opportunity cost of using a natural resource represent?',
    options: [
      'The money spent extracting the resource',
      'The value of the best alternative use that is given up',
      'The total amount of the resource in nature',
      'The market price after taxes',
    ],
    answer: 1,
    explanation: 'Opportunity cost is the value of the best alternative forgone when a choice is made.',
  },
  {
    question: 'What is a negative environmental externality?',
    options: [
      'A cost imposed on others that is not reflected in the decision-maker’s private cost',
      'A benefit received only by the person producing a good',
      'A government payment to restore a habitat',
      'A resource traded in an international market',
    ],
    answer: 0,
    explanation: 'A negative externality occurs when an activity imposes costs on third parties that are not included in its market price.',
  },
  {
    question: 'Why are future environmental benefits often discounted in economic analysis?',
    options: [
      'Because future benefits are always less valuable to society',
      'To convert benefits received at different times into comparable present values',
      'To remove uncertainty from ecological forecasts',
      'Because discounting measures biodiversity directly',
    ],
    answer: 1,
    explanation: 'Discounting expresses costs and benefits occurring at different times in present-value terms; the chosen rate can strongly affect long-term comparisons.',
  },
  {
    question: 'Which is an example of a direct-use value of a forest?',
    options: [
      'The value people place on knowing a rare species exists',
      'The value of timber harvested for use',
      'The value of preserving the forest for future generations only',
      'The value of an ecosystem without any human use',
    ],
    answer: 1,
    explanation: 'Harvesting timber is a direct use of the forest. Existence and bequest values are examples of non-use values.',
  },
  {
    question: 'A person values protecting a species even though they will never see or use it. This is primarily:',
    options: [
      'An existence value',
      'A resale value',
      'A marginal extraction cost',
      'A use value from harvesting',
    ],
    answer: 0,
    explanation: 'Existence value is the value people place on knowing that a species or ecosystem continues to exist, independent of direct use.',
  },
  {
    question: 'A common-pool resource is typically:',
    options: [
      'Easy to exclude people from, and non-rival in use',
      'Difficult to exclude people from, and rival in use',
      'Owned by one person and unlimited in supply',
      'A private good with no shared effects',
    ],
    answer: 1,
    explanation: 'Common-pool resources are generally difficult to exclude users from, while one person’s use can reduce what remains for others.',
  },
  {
    question: 'In the standard Pigouvian approach, an environmental tax is designed to:',
    options: [
      'Reflect the marginal external damage at the socially efficient level of activity',
      'Guarantee that polluting activity stops completely',
      'Replace all environmental monitoring',
      'Make private production costs equal to zero',
    ],
    answer: 0,
    explanation: 'A Pigouvian tax aims to internalize the external cost; in the standard model, it is set equal to marginal external damage at the efficient level.',
  },
  {
    question: 'Which ecosystem service is most directly illustrated when wetlands reduce flood peaks?',
    options: [
      'A cultural service',
      'A regulating service',
      'A provisioning service',
      'A manufactured service',
    ],
    answer: 1,
    explanation: 'Flood regulation is a regulating ecosystem service because it helps control an environmental process.',
  },
  {
    question: 'The idea of sustainable development emphasizes:',
    options: [
      'Meeting present needs without undermining future generations’ ability to meet their needs',
      'Maximizing current resource extraction in every case',
      'Avoiding all forms of economic activity',
      'Using only resources with a market price',
    ],
    answer: 0,
    explanation: 'Sustainable development considers present well-being alongside the ability of future generations to meet their needs.',
  },
  {
    question: 'Contingent valuation is a method that commonly estimates environmental value by asking people about their:',
    options: [
      'Observed timber purchases only',
      'Stated willingness to pay or willingness to accept in a hypothetical scenario',
      'Annual household energy use without any valuation question',
      'Distance traveled to a resource, without collecting preferences',
    ],
    answer: 1,
    explanation: 'Contingent valuation is a stated-preference method that asks respondents to value an environmental change under a described hypothetical scenario.',
  },
]

export function DemoQuiz() {
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [index, setIndex] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const score = questions.reduce((total, question, questionIndex) => total + (answers[questionIndex] === question.answer ? 1 : 0), 0)

  return (
    <main className="page-wrap quiz-wrap demo-quiz">
      <header className="topbar">
        <Link className="brand" href="/"><span className="brand-icon"><Leaf size={19} /></span>NPTEL <span className="brand-muted">PRACTICE</span></Link>
        <Link className="back-link" href="/"><ArrowLeft size={15} /> Home</Link>
      </header>
      {submitted ? (
        <>
          <section className="results-heading">
            <span className="eyebrow">DEMO PRACTICE QUIZ · COMPLETE</span>
            <h1>Your score</h1>
            <div className="score-box"><strong>{score}</strong><span>/ 10</span></div>
            <p>General Conservation Economics practice questions. Not official NPTEL exam questions.</p>
          </section>
          <h2 className="review-title">Correct answers</h2>
          <section className="result-list" aria-label="Quiz answer review">
            {questions.map((question, questionIndex) => {
              const selected = answers[questionIndex]
              return (
                <article className="result-card" key={question.question}>
                  <span className="eyebrow">QUESTION {questionIndex + 1} · {selected === question.answer ? 'CORRECT' : 'REVIEW'}</span>
                  <h3>{question.question}</h3>
                  <p>Your answer: <b>{selected === undefined ? 'Not answered' : question.options[selected]}</b></p>
                  <p className="correct-answer">Correct answer: <b>{question.options[question.answer]}</b></p>
                  <p className="explanation-text">{question.explanation}</p>
                </article>
              )
            })}
          </section>
          <Link className="button button-outline result-back" href="/">Back to Home</Link>
        </>
      ) : (
        <>
          <div className="demo-heading">
            <span className="eyebrow">CONSERVATION ECONOMICS · DEMO PRACTICE</span>
            <h1>Question {index + 1} <span>/ {questions.length}</span></h1>
            <p>Choose one answer. Your selections stay on this page until you submit.</p>
          </div>
          <div className="quiz-progress" aria-label={`Question ${index + 1} of ${questions.length}`}>
            <span style={{ width: `${((index + 1) / questions.length) * 100}%` }} />
          </div>
          <section className="question-card demo-question">
            <fieldset>
              <legend>{questions[index].question}</legend>
              <div className="demo-option-stack">
                {questions[index].options.map((option, optionIndex) => (
                  <label className={`demo-option${answers[index] === optionIndex ? ' selected' : ''}`} key={option}>
                    <input
                      type="radio"
                      name={`question-${index}`}
                      value={optionIndex}
                      checked={answers[index] === optionIndex}
                      onChange={() => setAnswers((current) => ({ ...current, [index]: optionIndex }))}
                    />
                    <span className="demo-option-letter">{String.fromCharCode(65 + optionIndex)}</span>
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="demo-controls">
              <button className="button button-outline" disabled={index === 0} onClick={() => setIndex((current) => current - 1)}><ArrowLeft size={15} /> Previous</button>
              <button className="button button-outline" disabled={index === questions.length - 1} onClick={() => setIndex((current) => current + 1)}>Next <ArrowRight size={15} /></button>
              <button className="button button-primary" onClick={() => setSubmitted(true)}>Submit Quiz</button>
            </div>
          </section>
        </>
      )}
    </main>
  )
}
